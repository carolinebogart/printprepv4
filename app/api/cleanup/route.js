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
  const startTime = Date.now();
  const errors = [];

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

  let cleanedImages = 0;

  if (expiredImages && expiredImages.length > 0) {
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
        errors.push({ phase: 'output_storage', error: outputDeleteErr.message });
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
        errors.push({ phase: 'original_storage', error: origDeleteErr.message });
      }
    }

    // Mark images as expired (thumbnail_path and metadata stay for history)
    const { error: updateError } = await supabase
      .from('images')
      .update({ expired_at: now })
      .in('id', imageIds);

    if (updateError) {
      console.error('Cleanup update error:', updateError.message);
      errors.push({ phase: 'expired_at_update', error: updateError.message });
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    cleanedImages = expiredImages.length;
    console.log(`Cleanup: expired ${cleanedImages} image(s)`);
  }

  // ── Conversion jobs cleanup ─────────────────────────────────────────────
  const { data: expiredJobs } = await supabase
    .from('conversion_jobs')
    .select('id, storage_path, user_id, page_count')
    .lt('expires_at', now)
    .is('expired_at', null)
    .limit(50);

  let cleanedJobs = 0;
  if (expiredJobs && expiredJobs.length > 0) {
    const jobIds = expiredJobs.map((j) => j.id);

    // Fetch all conversion output storage paths
    const { data: convOutputs } = await supabase
      .from('conversion_outputs')
      .select('storage_path')
      .in('job_id', jobIds);

    const convOutputPaths = (convOutputs || []).map((o) => o.storage_path).filter(Boolean);
    if (convOutputPaths.length > 0) {
      const { error: convOutputDeleteErr } = await supabase.storage
        .from('printprep-images')
        .remove(convOutputPaths);
      if (convOutputDeleteErr) {
        console.warn('Conversion output storage deletion error:', convOutputDeleteErr.message);
        errors.push({ phase: 'conversion_output_storage', error: convOutputDeleteErr.message });
      }
    }

    // Delete original files + PDF page thumbnails
    const convPaths = [];
    for (const job of expiredJobs) {
      if (job.storage_path) convPaths.push(job.storage_path);
      // PDF page thumbnails follow the pattern: {userId}/conversions/thumbs/{jobId}-p{n}.jpg
      for (let p = 1; p <= (job.page_count || 1); p++) {
        convPaths.push(`${job.user_id}/conversions/thumbs/${job.id}-p${p}.jpg`);
      }
    }
    if (convPaths.length > 0) {
      const { error: convOrigDeleteErr } = await supabase.storage
        .from('printprep-images')
        .remove(convPaths);
      if (convOrigDeleteErr) {
        console.warn('Conversion original/thumb storage deletion error:', convOrigDeleteErr.message);
        errors.push({ phase: 'conversion_original_storage', error: convOrigDeleteErr.message });
      }
    }

    // Mark conversion jobs as expired
    const { error: jobUpdateError } = await supabase
      .from('conversion_jobs')
      .update({ expired_at: now })
      .in('id', jobIds);

    if (jobUpdateError) {
      console.warn('Conversion job expiry update error:', jobUpdateError.message);
      errors.push({ phase: 'conversion_expired_at_update', error: jobUpdateError.message });
    } else {
      cleanedJobs = expiredJobs.length;
      console.log(`Cleanup: expired ${cleanedJobs} conversion job(s)`);
    }
  }

  // Log this cron run to system_events for a permanent audit trail
  const durationMs = Date.now() - startTime;
  await supabase.from('system_events').insert({
    event_type: 'cleanup_run',
    severity: errors.length > 0 ? 'warning' : 'info',
    message: `Cleanup: ${cleanedImages} image(s) and ${cleanedJobs} conversion job(s) expired`,
    details: {
      images_cleaned: cleanedImages,
      conversion_jobs_cleaned: cleanedJobs,
      duration_ms: durationMs,
      errors: errors.length > 0 ? errors : undefined,
    },
  });

  return Response.json({ cleaned: cleanedImages, cleanedJobs });
}
