import { createServiceClient } from '../../../../../../lib/supabase/service.js';
import { requireAdminApi, logAdminAction } from '../../../../../../lib/admin.js';

export async function POST(request, { params }) {
  const adminCheck = await requireAdminApi('support_admin');
  if (adminCheck.error) {
    return Response.json({ error: adminCheck.error.message }, { status: adminCheck.error.status });
  }

  const { id } = await params;
  const service = createServiceClient();

  // Get image
  const { data: image, error: imgError } = await service
    .from('images')
    .select('*')
    .eq('id', id)
    .single();

  if (imgError || !image) {
    return Response.json({ error: 'Image not found' }, { status: 404 });
  }

  // Fetch outputs
  const { data: outputs } = await service
    .from('processed_outputs')
    .select('id, storage_path')
    .eq('image_id', id);

  // Delete output files from storage
  if (outputs && outputs.length > 0) {
    const outputPaths = outputs.map((o) => o.storage_path).filter(Boolean);
    if (outputPaths.length > 0) {
      await service.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'printprep-images').remove(outputPaths);
    }
    // Delete output records
    await service.from('processed_outputs').delete().eq('image_id', id);
  }

  // Delete original file
  if (image.storage_path) {
    await service.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'printprep-images').remove([image.storage_path]);
  }

  // Delete image record
  await service.from('images').delete().eq('id', id);

  // Audit log
  await logAdminAction(service, {
    adminUserId: adminCheck.admin.id,
    actionType: 'image_delete',
    targetUserId: image.user_id,
    adminNote: `Deleted image: ${image.original_filename}`,
    changes: {
      image_id: id,
      filename: image.original_filename,
      outputs_deleted: outputs?.length || 0,
    },
    request,
  });

  return Response.json({ success: true });
}
