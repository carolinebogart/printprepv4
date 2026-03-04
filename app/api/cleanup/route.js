import { createServiceClient } from '../../../lib/supabase/service.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by Railway cron (or any scheduler) via:
//   POST /api/cleanup
//   Authorization: Bearer <CRON_SECRET>
//
// Processes up to 50 expired images per invocation.
// Schedule daily — run multiple times if needed for high-volume cleanup.

export async function POST(request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_KEY || auth !== `Bearer ${process.env.CRON_KEY}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Find images past their expiry that haven't been cleaned yet
  const { data: expiredImages, error: fetchError } = await supabase
    .from('images')
    .select('id, storage_path')
    .lt('expires_at', now)
    .is('expired_at', null)
    .limit(50);

  if (fetchError) {
    console.error('Cleanup fetch error:', fetchError.message);
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expiredImages || expiredImages.length === 0) {
    return Response.json({ cleaned: 0 });
  }

  const imageIds = expiredImages.map((img) => img.id);

  // Fetch all output storage paths for these images
  const { data: outputs } = await supabase
    .from('processed_outputs')
    .select('storage_path')
    .in('image_id', imageIds);

  // Delete output files from storage
  const outputPaths = (outputs || []).map((o) => o.storage_path).filter(Boolean);
  if (outputPaths.length > 0) {
    const { error: outputDeleteErr } = await supabase.storage
      .from('printprep-images')
      .remove(outputPaths);
    if (outputDeleteErr) {
      console.warn('Output storage deletion partial error:', outputDeleteErr.message);
    }
  }

  // Delete original files from storage (thumbnails are intentionally preserved)
  const originalPaths = expiredImages.map((img) => img.storage_path).filter(Boolean);
  if (originalPaths.length > 0) {
    const { error: origDeleteErr } = await supabase.storage
      .from('printprep-images')
      .remove(originalPaths);
    if (origDeleteErr) {
      console.warn('Original storage deletion partial error:', origDeleteErr.message);
    }
  }

  // Mark images as expired (thumbnail_path and metadata stay for history)
  const { error: updateError } = await supabase
    .from('images')
    .update({ expired_at: now })
    .in('id', imageIds);

  if (updateError) {
    console.error('Cleanup update error:', updateError.message);
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`Cleanup: expired ${expiredImages.length} image(s)`);
  return Response.json({ cleaned: expiredImages.length });
}
