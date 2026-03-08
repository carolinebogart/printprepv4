import { createServiceClient } from './supabase/service.js';

/**
 * Log a system event to the system_events table.
 * Fire-and-forget — never throws. Safe to call without awaiting.
 *
 * @param {object} params
 * @param {string} params.eventType - 'upscale_failure' | 'background_removal_failure' | 'crop_failure' | 'resize_failure' | 'upload_failure' | 'download_failure' | 'db_insert_failure' | 'output_mismatch' | 'processing_crash'
 * @param {string} [params.severity] - 'warning' | 'error' | 'critical'
 * @param {string} params.message
 * @param {object} [params.details]
 * @param {string|null} [params.userId]
 * @param {string|null} [params.imageId]
 */
export async function logSystemEvent({ eventType, severity = 'error', message, details = {}, userId = null, imageId = null }) {
  try {
    const serviceClient = createServiceClient();
    await serviceClient.from('system_events').insert({
      event_type: eventType,
      severity,
      message,
      details,
      user_id: userId,
      image_id: imageId,
    });
  } catch (err) {
    console.error('[system-events] Failed to log system event:', err.message);
  }
}
