import { requireAdminApi } from '../../../../../lib/admin.js';
import { createServiceClient } from '../../../../../lib/supabase/service.js';

// POST /api/admin/mockups/frames — upload a new frame texture strip
export async function POST(request) {
  const auth = await requireAdminApi('support_admin');
  if (auth.error) return Response.json({ error: auth.error.message }, { status: auth.error.status });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const name = formData.get('name')?.trim();
    const thicknessPx = parseInt(formData.get('thickness_px'), 10) || 20;
    const isDefault = formData.get('is_default') === 'true';

    if (!file || !name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const frameId = crypto.randomUUID();
    const storagePath = `mockups/templates/frames/${frameId}.${ext}`;

    const service = createServiceClient();

    const { error: uploadErr } = await service.storage
      .from('printprep-images')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    // If setting as default, clear existing defaults first
    if (isDefault) {
      await service.from('mockup_frames').update({ is_default: false }).eq('is_default', true);
    }

    const { data: frame, error: insertErr } = await service
      .from('mockup_frames')
      .insert({
        id: frameId,
        name,
        storage_path: storagePath,
        thickness_px: thicknessPx,
        is_default: isDefault,
      })
      .select()
      .single();

    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    return Response.json({ frame });
  } catch (err) {
    console.error('[admin/mockups/frames POST]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
