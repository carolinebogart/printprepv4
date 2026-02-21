import { createServerClient } from '../../../lib/supabase/server.js';
import { createServiceClient } from '../../../lib/supabase/service.js';
import { processAllCrops } from '../../../lib/image-processor.js';
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

    // Process all crops
    const dpi = parseInt(process.env.DEFAULT_DPI || '300', 10);
    const results = await processAllCrops(originalBuffer, cropConfigs, dpi);

    // Upload outputs to storage and create DB records
    const serviceClient = createServiceClient();
    const outputs = [];

    for (const result of results) {
      if (!result.success) {
        outputs.push({ ...result, uploaded: false });
        continue;
      }

      const storagePath = `${user.id}/outputs/${imageId}/${result.filename}`;

      // Upload to storage
      const { error: uploadError } = await serviceClient.storage
        .from('printprep-images')
        .upload(storagePath, result.buffer, {
          contentType: result.format === 'png' ? 'image/png' : 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        outputs.push({
          ...result,
          buffer: undefined,
          uploaded: false,
          error: 'Storage upload failed',
        });
        continue;
      }

      // Create processed_outputs record
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
          ...result,
          buffer: undefined,
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
      outputs: outputs.map(({ buffer, ...rest }) => rest),
    });
  } catch (err) {
    console.error('Process API error:', err);
    return Response.json({ error: 'Processing failed. Please try again.' }, { status: 500 });
  }
}
