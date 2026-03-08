import { createServerClient } from '../../../lib/supabase/server.js';
import { createServiceClient } from '../../../lib/supabase/service.js';
import { extractCrop, resizeToTarget, upscaleCropWithAI, removeBackground } from '../../../lib/image-processor.js';
import { generateOutputFilename } from '../../../lib/output-sizes.js';
import { hasCredits, canUsePng, getRetentionDays } from '../../../lib/credits.js';
import { logSystemEvent } from '../../../lib/system-events.js';
import { generateMockupForImage } from '../../../lib/mockup-generator.js';

function sseEvent(obj) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(request) {
  // --- Pre-flight checks (return normal JSON errors before opening the stream) ---
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!subscription || !hasCredits(subscription)) {
    return Response.json({ error: 'No credits remaining. Please upgrade your plan.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { imageId, cropConfigs, removeBackground: removeBackgroundRequested = false } = body;

  const hasPngRequest = Array.isArray(cropConfigs) &&
    cropConfigs.some((c) => c.backgroundColor === 'transparent');
  if (hasPngRequest && !canUsePng(subscription)) {
    return Response.json({
      error: 'Transparent PNG output requires a Professional or Enterprise plan.',
      upgradeRequired: true,
    }, { status: 403 });
  }

  if (!imageId || !cropConfigs || !Array.isArray(cropConfigs) || cropConfigs.length === 0) {
    return Response.json({ error: 'Invalid request. imageId and cropConfigs required.' }, { status: 400 });
  }

  const { data: image, error: imgError } = await supabase
    .from('images')
    .select('*')
    .eq('id', imageId)
    .eq('user_id', user.id)
    .single();

  if (imgError || !image) {
    return Response.json({ error: 'Image not found' }, { status: 404 });
  }

  // --- All checks passed — open SSE stream ---
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(obj)));
        } catch {
          // Client disconnected — ignore
        }
      };

      const eventContext = {
        userEmail: user.email,
        planName: subscription.plan_name,
        imageDimensions: `${image.width}x${image.height}`,
        imageFormat: image.format,
        originalFilename: image.storage_path.split('/').pop(),
      };

      try {
        // Phase: download
        emit({ type: 'phase', phase: 'download', message: 'Downloading image...' });

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('printprep-images')
          .download(image.storage_path);

        if (downloadError || !fileData) {
          emit({ type: 'error', error: 'Failed to retrieve image' });
          controller.close();
          return;
        }

        let originalBuffer = Buffer.from(await fileData.arrayBuffer());
        const dpi = parseInt(process.env.DEFAULT_DPI || '300', 10);
        const serviceClient = createServiceClient();
        const outputs = [];

        const requestedCount = cropConfigs.reduce((sum, c) => sum + (c.sizes?.length || 0), 0);
        const cropResults = new Map();
        const upscaleWarnings = new Map();

        // Phase: extracting crops
        emit({ type: 'phase', phase: 'extracting', message: `Extracting ${cropConfigs.length} crop region${cropConfigs.length !== 1 ? 's' : ''}...` });

        for (const config of cropConfigs) {
          const { ratioKey, cropData, sizes } = config;
          try {
            cropResults.set(ratioKey, await extractCrop(originalBuffer, cropData));
          } catch (error) {
            for (const size of sizes) {
              outputs.push({ ratioKey, sizeLabel: size.label, success: false, uploaded: false, error: error.message });
            }
          }
        }

        // Release original buffer
        originalBuffer = null;

        // Phase 1.5: AI upscale
        const needsUpscale = cropConfigs.some((c) => c.sizes?.some((s) => s.useUpscaling));
        if (needsUpscale) {
          emit({ type: 'phase', phase: 'upscaling', message: 'AI upscaling...' });

          for (const config of cropConfigs) {
            const { ratioKey, sizes } = config;
            if (!sizes.some((s) => s.useUpscaling)) continue;

            const cropResult = cropResults.get(ratioKey);
            if (!cropResult) continue;

            try {
              cropResult.croppedBuffer = await upscaleCropWithAI(cropResult.croppedBuffer);
            } catch (error) {
              console.error(`[upscale] AI upscaling failed for ratio ${ratioKey}:`, error.message);
              logSystemEvent({
                eventType: 'upscale_failure',
                severity: 'error',
                message: `Replicate upscaling failed for ratio ${ratioKey}: ${error.message}`,
                details: { ratioKey, requestedSizeCount: sizes.length, errorMessage: error.message, ...eventContext },
                userId: user.id,
                imageId,
              });
              upscaleWarnings.set(ratioKey, `AI upscaling was skipped for the ${ratioKey} ratio — your image is too large for the upscaling service. Standard outputs were generated instead.`);
            }
          }
        }

        // Phase 1.7: Background removal
        let backgroundRemovalWarning = null;
        if (removeBackgroundRequested) {
          emit({ type: 'phase', phase: 'removebg', message: 'Removing background...' });

          for (const [ratioKey, cropResult] of cropResults.entries()) {
            try {
              cropResult.croppedBuffer = await removeBackground(cropResult.croppedBuffer);
            } catch (error) {
              console.error(`[removebg] Background removal failed for ratio ${ratioKey}:`, error.message);
              logSystemEvent({
                eventType: 'background_removal_failure',
                severity: 'warning',
                message: `remove.bg failed for ratio ${ratioKey}: ${error.message}`,
                details: { ratioKey, errorMessage: error.message, ...eventContext },
                userId: user.id,
                imageId,
              });
              backgroundRemovalWarning = 'Background removal failed and was skipped — standard outputs were generated instead.';
            }
          }
        }

        // Phase 2: Resize + upload
        emit({ type: 'phase', phase: 'resizing', message: 'Generating outputs...' });

        let fileIndex = 0;

        for (const config of cropConfigs) {
          const { ratioKey, sizes, backgroundColor: rawBgColor = '#FFFFFF', useShadow = false } = config;
          const backgroundColor = removeBackgroundRequested ? 'transparent' : rawBgColor;

          let cropResult = cropResults.get(ratioKey);
          if (!cropResult) continue;

          for (const size of sizes) {
            let result;

            try {
              const { buffer, format } = await resizeToTarget(
                cropResult,
                size.width,
                size.height,
                dpi,
                backgroundColor,
                useShadow
              );

              const filename = generateOutputFilename(ratioKey, size.width, size.height, dpi, format);
              const { width: outW, height: outH } = await (await import('sharp')).default(buffer).metadata();
              result = { ratioKey, sizeLabel: size.label, filename, buffer, format, width: outW, height: outH, success: true };
            } catch (error) {
              fileIndex++;
              emit({ type: 'file', index: fileIndex, total: requestedCount, ratioKey, sizeLabel: size.label, success: false });
              outputs.push({ ratioKey, sizeLabel: size.label, success: false, uploaded: false, error: error.message });
              continue;
            }

            const storagePath = `${user.id}/outputs/${imageId}/${result.filename}`;

            const { error: uploadError } = await serviceClient.storage
              .from('printprep-images')
              .upload(storagePath, result.buffer, {
                contentType: result.format === 'png' ? 'image/png' : 'image/jpeg',
                upsert: true,
              });

            result.buffer = null;
            if (global.gc) global.gc();

            if (uploadError) {
              logSystemEvent({
                eventType: 'upload_failure',
                severity: 'error',
                message: `Storage upload failed for ${result.filename}: ${uploadError.message}`,
                details: { ratioKey: result.ratioKey, sizeLabel: result.sizeLabel, filename: result.filename, storagePath, errorMessage: uploadError.message, ...eventContext },
                userId: user.id,
                imageId,
              });
              fileIndex++;
              emit({ type: 'file', index: fileIndex, total: requestedCount, ratioKey: result.ratioKey, sizeLabel: result.sizeLabel, success: false });
              outputs.push({ ratioKey: result.ratioKey, sizeLabel: result.sizeLabel, filename: result.filename, format: result.format, success: true, uploaded: false, error: 'Storage upload failed' });
              continue;
            }

            const { data: outputRecord, error: dbError } = await serviceClient
              .from('processed_outputs')
              .insert({
                image_id: imageId,
                user_id: user.id,
                ratio_key: result.ratioKey,
                size_label: result.sizeLabel,
                filename: result.filename,
                storage_path: storagePath,
                format: result.format,
                status: 'completed',
                width: result.width ?? null,
                height: result.height ?? null,
              })
              .select()
              .single();

            fileIndex++;
            emit({ type: 'file', index: fileIndex, total: requestedCount, ratioKey: result.ratioKey, sizeLabel: result.sizeLabel, success: !dbError });

            if (dbError) {
              outputs.push({ filename: result.filename, ratioKey: result.ratioKey, sizeLabel: result.sizeLabel, format: result.format, success: true, uploaded: true, dbError: dbError.message });
              continue;
            }

            outputs.push({ id: outputRecord.id, filename: result.filename, ratioKey: result.ratioKey, sizeLabel: result.sizeLabel, format: result.format, success: true, uploaded: true });
          }

          cropResult.croppedBuffer = null;
          cropResult = null;
        }

        const successCount = outputs.filter((o) => o.success && o.uploaded).length;

        if (successCount < requestedCount) {
          const failures = outputs.filter((o) => !o.success || !o.uploaded);
          const failureBreakdown = {};
          failures.forEach((f) => { const key = f.error || 'unknown'; failureBreakdown[key] = (failureBreakdown[key] || 0) + 1; });
          logSystemEvent({
            eventType: 'output_mismatch',
            severity: successCount === 0 ? 'critical' : 'warning',
            message: `Output count mismatch: ${successCount} of ${requestedCount} outputs succeeded`,
            details: { requestedCount, successCount, failureBreakdown, failures: failures.map((f) => ({ ratioKey: f.ratioKey, sizeLabel: f.sizeLabel, error: f.error })), ...eventContext },
            userId: user.id,
            imageId,
          });
        }

        let expiresAt = null;
        if (successCount > 0) {
          await serviceClient
            .from('subscriptions')
            .update({ credits_used: (subscription.credits_used || 0) + 1 })
            .eq('user_id', user.id);

          const retentionDays = getRetentionDays(subscription);
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + retentionDays);
          await serviceClient
            .from('images')
            .update({ status: 'processed', expires_at: expiresAt.toISOString() })
            .eq('id', imageId);
        }

        // Auto-mockup: fire-and-forget
        if (successCount > 0) {
          const { data: mockupPrefs } = await supabase
            .from('user_mockup_prefs')
            .select('auto_mockup')
            .eq('user_id', user.id)
            .single();

          if (mockupPrefs?.auto_mockup) {
            generateMockupForImage({
              imageId,
              userId: user.id,
              sceneId: null,
              frameId: null,
              matColor: null,
              matThicknessPx: null,
              supabase,
              serviceClient,
            }).catch((err) => {
              console.error('[auto-mockup] Failed for image', imageId, err?.message);
            });
          }
        }

        emit({
          type: 'done',
          result: {
            success: true,
            imageId,
            expiresAt: expiresAt?.toISOString() ?? null,
            totalOutputs: outputs.length,
            successfulOutputs: successCount,
            outputs,
            warnings: [
              ...Array.from(upscaleWarnings.values()),
              ...(backgroundRemovalWarning ? [backgroundRemovalWarning] : []),
            ],
          },
        });

        controller.close();
      } catch (err) {
        const mem = process.memoryUsage();
        console.error('Process API error:', err?.message, err?.stack,
          `| heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
          `| rss: ${Math.round(mem.rss / 1024 / 1024)}MB`);
        logSystemEvent({
          eventType: 'processing_crash',
          severity: 'critical',
          message: `Processing crashed: ${err?.message}`,
          details: {
            errorMessage: err?.message,
            stack: err?.stack?.slice(0, 500),
            userEmail: user?.email ?? null,
            planName: subscription?.plan_name ?? null,
            imageId: imageId ?? null,
            imageDimensions: image ? `${image.width}x${image.height}` : null,
            heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
            rssMB: Math.round(mem.rss / 1024 / 1024),
          },
          userId: user?.id ?? null,
          imageId: imageId ?? null,
        });
        emit({ type: 'error', error: 'Processing failed. Please try again.' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
