import { createServerClient } from '../../../../../lib/supabase/server.js';
import { createServiceClient } from '../../../../../lib/supabase/service.js';
import { requireAdminApi, logAdminAction } from '../../../../../lib/admin.js';

export async function POST(request) {
  const supabase = await createServerClient();
  const adminCheck = await requireAdminApi(supabase, 'support_admin');
  if (adminCheck.error) {
    return Response.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { image_ids } = await request.json();

  if (!Array.isArray(image_ids) || image_ids.length === 0) {
    return Response.json({ error: 'image_ids array is required' }, { status: 400 });
  }

  if (image_ids.length > 100) {
    return Response.json({ error: 'Maximum 100 images per bulk delete' }, { status: 400 });
  }

  const service = createServiceClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'printprep-images';

  // Fetch all images
  const { data: images } = await service
    .from('images')
    .select('*')
    .in('id', image_ids);

  if (!images || images.length === 0) {
    return Response.json({ error: 'No images found' }, { status: 404 });
  }

  // Fetch all outputs for these images
  const { data: outputs } = await service
    .from('processed_outputs')
    .select('id, image_id, storage_path')
    .in('image_id', image_ids);

  // Delete output files from storage
  if (outputs && outputs.length > 0) {
    const outputPaths = outputs.map((o) => o.storage_path).filter(Boolean);
    if (outputPaths.length > 0) {
      // Supabase storage remove has limits, batch in groups of 100
      for (let i = 0; i < outputPaths.length; i += 100) {
        await service.storage.from(bucket).remove(outputPaths.slice(i, i + 100));
      }
    }
    // Delete output records
    await service.from('processed_outputs').delete().in('image_id', image_ids);
  }

  // Delete original files from storage
  const originalPaths = images.map((img) => img.storage_path).filter(Boolean);
  if (originalPaths.length > 0) {
    for (let i = 0; i < originalPaths.length; i += 100) {
      await service.storage.from(bucket).remove(originalPaths.slice(i, i + 100));
    }
  }

  // Delete image records
  await service.from('images').delete().in('id', image_ids);

  // Audit log
  const affectedUsers = [...new Set(images.map((img) => img.user_id))];
  await logAdminAction(service, {
    admin_user_id: adminCheck.user.id,
    action_type: 'image_bulk_delete',
    admin_note: `Bulk deleted ${images.length} images`,
    changes: {
      image_count: images.length,
      output_count: outputs?.length || 0,
      affected_users: affectedUsers,
      filenames: images.map((img) => img.original_filename),
    },
    ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  });

  return Response.json({ success: true, deleted: images.length });
}
