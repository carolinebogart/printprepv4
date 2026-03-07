import { createServerClient } from '../../../../lib/supabase/server.js';
import { createServiceClient } from '../../../../lib/supabase/service.js';
import { generateMockupForImage } from '../../../../lib/mockup-generator.js';

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'authentication_required' }, { status: 401 });
    }

    const { imageId, sceneId, frameId, matColor, matThicknessPx } = await request.json();

    if (!imageId) {
      return Response.json({ error: 'imageId is required' }, { status: 400 });
    }

    // Verify image ownership
    const { data: image, error: imgError } = await supabase
      .from('images')
      .select('id, user_id')
      .eq('id', imageId)
      .eq('user_id', user.id)
      .single();

    if (imgError || !image) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    const serviceClient = createServiceClient();

    const mockupOutput = await generateMockupForImage({
      imageId,
      userId: user.id,
      sceneId: sceneId ?? null,
      frameId: frameId ?? null,
      matColor: matColor ?? null,
      matThicknessPx: matThicknessPx ?? null,
      supabase,
      serviceClient,
    });

    // Generate signed URL for immediate display
    const { data: signedUrl } = await supabase.storage
      .from('printprep-images')
      .createSignedUrl(mockupOutput.storage_path, 3600);

    return Response.json({
      mockupOutputId: mockupOutput.id,
      url: signedUrl?.signedUrl ?? null,
      width: mockupOutput.width,
      height: mockupOutput.height,
    });
  } catch (err) {
    console.error('[mockup/generate]', err);
    return Response.json({ error: 'processing_error', message: 'Failed to generate mockup. Please try again.' }, { status: 500 });
  }
}
