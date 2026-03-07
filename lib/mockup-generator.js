import { generateMockup } from './mockup-compositor.js';

/**
 * Shared mockup generation logic — used by both:
 *   - POST /api/mockup/generate (on-demand)
 *   - POST /api/process (auto-mockup after processing)
 *
 * Resolves scene/frame from params or user defaults, picks the largest
 * processed output for the image, runs the compositor, uploads the result,
 * and inserts a mockup_outputs record.
 *
 * @param {Object} params
 * @param {string} params.imageId
 * @param {string} params.userId
 * @param {string|null} params.sceneId       - Override; null = use user/system default
 * @param {string|null} params.frameId       - Override; null = use user/system default ('none' = no frame)
 * @param {string|null} params.matColor      - Override; null = use user/system default
 * @param {number|null} params.matThicknessPx - Override; null = use user/system default
 * @param {Object} params.supabase           - Authenticated Supabase client
 * @param {Object} params.serviceClient      - Service role Supabase client
 * @returns {Promise<Object>} The inserted mockup_outputs record
 */
export async function generateMockupForImage({
  imageId,
  userId,
  sceneId,
  frameId,
  matColor,
  matThicknessPx,
  supabase,
  serviceClient,
}) {
  // --- Resolve user mockup prefs ---
  const { data: userPrefs } = await supabase
    .from('user_mockup_prefs')
    .select('*')
    .eq('user_id', userId)
    .single();

  const resolvedSceneId = sceneId ?? userPrefs?.default_scene_id ?? null;
  const resolvedFrameId = frameId ?? userPrefs?.default_frame_id ?? null;
  const resolvedMatColor = matColor ?? userPrefs?.default_mat_color ?? null;
  const resolvedMatThicknessPx = matThicknessPx ?? userPrefs?.default_mat_thickness_px ?? null;

  // --- Load scene ---
  let sceneQuery = supabase.from('mockup_scenes').select('*');
  if (resolvedSceneId) {
    sceneQuery = sceneQuery.eq('id', resolvedSceneId);
  } else {
    sceneQuery = sceneQuery.eq('is_default', true).eq('is_active', true).limit(1);
  }
  const { data: sceneRows, error: sceneErr } = await sceneQuery;
  if (sceneErr || !sceneRows?.length) throw new Error('No active mockup scene found');
  const scene = sceneRows[0];

  // --- Load frame (optional) ---
  let frame = null;
  let effectiveFrameId = resolvedFrameId;

  if (resolvedFrameId !== 'none') {
    let frameQuery = supabase.from('mockup_frames').select('*');
    if (resolvedFrameId) {
      frameQuery = frameQuery.eq('id', resolvedFrameId);
    } else {
      // System default frame
      frameQuery = frameQuery.eq('is_default', true).eq('is_active', true).limit(1);
    }
    const { data: frameRows } = await frameQuery;
    frame = frameRows?.[0] ?? null;
    effectiveFrameId = frame?.id ?? null;
  }

  // --- Find largest processed output for this image ---
  const { data: outputs, error: outErr } = await supabase
    .from('processed_outputs')
    .select('id, output_path, width, height')
    .eq('image_id', imageId)
    .order('width', { ascending: false })
    .limit(1);

  if (outErr || !outputs?.length) throw new Error('No processed outputs found for image');
  const output = outputs[0];

  // --- Download scene image ---
  const { data: sceneBlob, error: sceneDownErr } = await serviceClient.storage
    .from('printprep-images')
    .download(scene.storage_path);
  if (sceneDownErr || !sceneBlob) throw new Error('Failed to download scene image');
  const sceneBuffer = Buffer.from(await sceneBlob.arrayBuffer());

  // --- Download frame texture strip (if any) ---
  let frameBuffer = null;
  if (frame) {
    const { data: frameBlob, error: frameDownErr } = await serviceClient.storage
      .from('printprep-images')
      .download(frame.storage_path);
    if (frameDownErr || !frameBlob) throw new Error('Failed to download frame texture');
    frameBuffer = Buffer.from(await frameBlob.arrayBuffer());
  }

  // --- Download artwork (processed output) ---
  const { data: artBlob, error: artDownErr } = await serviceClient.storage
    .from('printprep-images')
    .download(output.output_path);
  if (artDownErr || !artBlob) throw new Error('Failed to download processed output');
  const artworkBuffer = Buffer.from(await artBlob.arrayBuffer());

  // --- Run compositor ---
  const resultBuffer = await generateMockup({
    artworkBuffer,
    artworkWidthPx: output.width,
    artworkHeightPx: output.height,
    sceneBuffer,
    scene,
    frameBuffer,
    frame,
    matColor: resolvedMatColor,
    matThicknessPx: resolvedMatThicknessPx,
  });

  // --- Get output dimensions ---
  const sharp = (await import('sharp')).default;
  const resultMeta = await sharp(resultBuffer).metadata();

  // --- Upload to storage ---
  const mockupId = crypto.randomUUID();
  const storagePath = `mockups/outputs/${imageId}/${mockupId}.jpg`;

  const { error: uploadErr } = await serviceClient.storage
    .from('printprep-images')
    .upload(storagePath, resultBuffer, { contentType: 'image/jpeg', upsert: false });
  if (uploadErr) throw new Error(`Failed to upload mockup: ${uploadErr.message}`);

  // --- Insert mockup_outputs record ---
  const { data: mockupRecord, error: insertErr } = await serviceClient
    .from('mockup_outputs')
    .insert({
      id: mockupId,
      image_id: imageId,
      processed_output_id: output.id,
      scene_id: scene.id,
      frame_id: effectiveFrameId,
      mat_color: resolvedMatColor,
      mat_thickness_px: resolvedMatThicknessPx,
      storage_path: storagePath,
      width: resultMeta.width,
      height: resultMeta.height,
    })
    .select()
    .single();

  if (insertErr) throw new Error(`Failed to insert mockup record: ${insertErr.message}`);

  return mockupRecord;
}
