import { createServerClient } from '../../../lib/supabase/server.js';
import { createServiceClient } from '../../../lib/supabase/service.js';
import { applyCropAndResize } from '../../../lib/image-processor.js';
import { generateOutputFilename } from '../../../lib/output-sizes.js';
import { hasCredits } from '../../../lib/credits.js';

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check subscription & credits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!subscription || !hasCredits(subscription)) {
      return Response.json({ error: 'No credits remaining. Please upgrade your plan.' }, { status: 403 });
    }

    // Parse request body
    const { imageId, cropConfigs } = await request.json();

    if (!imageId || !cropConfigs || !Array.isArray(cropConfigs) || cropConfigs.length === 0) {
      return Response.json({ error: 'Invalid request. imageId and cropConfigs required.' }, { status: 400 });
    }

    // Verify image ownership
    const { data: image, error: imgError } = await supabase
      .from('images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', user.id)
      .single();

    if (imgError || !image) {
      return Response.json({ error: 'Image not found' }, { status: 404 });
    }

    // Download the original image from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('printprep-images')
      .download(image.storage_path);

    if (downloadError || !fileData) {
      return Response.json({ error: 'Failed to retrieve image' }, { status: 500 });
    }

    const originalBuffer = Buffer.from(await fileData.arrayBuffer());
    const dpi = parseInt(process.env.DEFAULT_DPI || '300', 10);
    const serviceClient = createServiceClient();
    const outputs = [];

    // Process one size at a time: Sharp → upload → release buffer
    // This keeps memory usage low instead of buffering all outputs at once
    for (const config of cropConfigs) {
      const { ratioKey, cropData, sizes, backgroundColor = '#FFFFFF', useShadow = false } = config;

      for (const size of sizes) {
        let result;

        // Step 1: Process with Sharp
        try {
          const { buffer, format } = await applyCropAndResize(
            originalBuffer,
            cropData,
            size.width,
            size.height,
            dpi,
            backgroundColor,
            useShadow
          );

          const filename = generateOutputFilename(
            ratioKey,
            size.width,
            size.height,
            dpi,
            format
          );

          result = { ratioKey, sizeLabel: size.label, filename, buffer, format, success: true };
        } catch (error) {
          outputs.push({
            ratioKey,
            sizeLabel: size.label,
            success: false,
            uploaded: false,
            error: error.message,
          });
          continue;
        }

        // Step 2: Upload immediately (then buffer can be GC'd)
        const storagePath = `${user.id}/outputs/${imageId}/${result.filename}`;

        const { error: uploadError } = await serviceClient.storage
          .from('printprep-images')
          .upload(storagePath, result.buffer, {
            contentType: result.format === 'png' ? 'image/png' : 'image/jpeg',
            upsert: true,
          });

        // Release the buffer reference
        result.buffer = null;

        if (uploadError) {
          outputs.push({
            ratioKey: result.ratioKey,
            sizeLabel: result.sizeLabel,
            filename: result.filename,
            format: result.format,
            success: true,
            uploaded: false,
            error: 'Storage upload failed',
          });
          continue;
        }

        // Step 3: Create DB record
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
          })
          .select()
          .single();

        if (dbError) {
          outputs.push({
            filename: result.filename,
            ratioKey: result.ratioKey,
            sizeLabel: result.sizeLabel,
            format: result.format,
            success: true,
            uploaded: true,
            dbError: dbError.message,
          });
          continue;
        }

        outputs.push({
          id: outputRecord.id,
          filename: result.filename,
          ratioKey: result.ratioKey,
          sizeLabel: result.sizeLabel,
          format: result.format,
          success: true,
          uploaded: true,
        });
      }
    }

    const successCount = outputs.filter((o) => o.success && o.uploaded).length;

    // Deduct 1 credit (1 credit per image, regardless of output count)
    if (successCount > 0) {
      await serviceClient
        .from('subscriptions')
        .update({
          credits_used: (subscription.credits_used || 0) + 1,
        })
        .eq('user_id', user.id);

      // Update image status
      await serviceClient
        .from('images')
        .update({ status: 'processed' })
        .eq('id', imageId);
    }

    return Response.json({
      success: true,
      imageId,
      totalOutputs: outputs.length,
      successfulOutputs: successCount,
      outputs,
    });
  } catch (err) {
    console.error('Process API error:', err?.message, err?.stack);
    return Response.json({ error: 'Processing failed. Please try again.' }, { status: 500 });
  }
}
