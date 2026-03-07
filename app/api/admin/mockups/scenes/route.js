import { requireAdminApi } from '../../../../../lib/admin.js';
import { createServiceClient } from '../../../../../lib/supabase/service.js';
import sharp from 'sharp';

// POST /api/admin/mockups/scenes — upload a new scene
export async function POST(request) {
  const auth = await requireAdminApi('support_admin');
  if (auth.error) return Response.json({ error: auth.error.message }, { status: auth.error.status });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const name = formData.get('name')?.trim();
    const description = formData.get('description')?.trim() || null;
    const frameAreaWidth = parseInt(formData.get('frame_area_width'), 10);
    const frameAreaHeight = parseInt(formData.get('frame_area_height'), 10);
    const placementX = parseInt(formData.get('placement_x'), 10);
    const placementY = parseInt(formData.get('placement_y'), 10);
    const referenceObjectLabel = formData.get('reference_object_label')?.trim();
    const referenceObjectInches = parseFloat(formData.get('reference_object_inches'));
    const referenceObjectPx = parseInt(formData.get('reference_object_px'), 10);
    const isDefault = formData.get('is_default') === 'true';

    if (!file || !name || !frameAreaWidth || !frameAreaHeight || !placementX || !placementY
      || !referenceObjectLabel || !referenceObjectInches || !referenceObjectPx) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const sceneId = crypto.randomUUID();
    const storagePath = `mockups/templates/scenes/${sceneId}.${ext}`;

    const service = createServiceClient();

    const { error: uploadErr } = await service.storage
      .from('printprep-images')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    // If setting as default, clear existing defaults first
    if (isDefault) {
      await service.from('mockup_scenes').update({ is_default: false }).eq('is_default', true);
    }

    const { data: scene, error: insertErr } = await service
      .from('mockup_scenes')
      .insert({
        id: sceneId,
        name,
        description,
        storage_path: storagePath,
        width: metadata.width,
        height: metadata.height,
        frame_area_width: frameAreaWidth,
        frame_area_height: frameAreaHeight,
        placement_x: placementX,
        placement_y: placementY,
        reference_object_label: referenceObjectLabel,
        reference_object_inches: referenceObjectInches,
        reference_object_px: referenceObjectPx,
        is_default: isDefault,
      })
      .select()
      .single();

    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    return Response.json({ scene });
  } catch (err) {
    console.error('[admin/mockups/scenes POST]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
