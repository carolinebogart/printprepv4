import { createServerClient } from '../../../../../../lib/supabase/server.js';
import { createServiceClient } from '../../../../../../lib/supabase/service.js';
import { requireAdminApi, logAdminAction } from '../../../../../../lib/admin.js';

export async function POST(request, { params }) {
  const supabase = await createServerClient();
  const adminCheck = await requireAdminApi(supabase, 'support_admin');
  if (adminCheck.error) {
    return Response.json({ error: adminCheck.error }, { status: adminCheck.status });
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
    admin_user_id: adminCheck.user.id,
    action_type: 'image_delete',
    target_user_id: image.user_id,
    admin_note: `Deleted image: ${image.original_filename}`,
    changes: {
      image_id: id,
      filename: image.original_filename,
      outputs_deleted: outputs?.length || 0,
    },
    ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  });

  return Response.json({ success: true });
}
