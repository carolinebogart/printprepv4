import { createServerClient } from '../../../../lib/supabase/server.js';

export async function GET(request, { params }) {
  try {
    const { outputId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch the output record
    const { data: output, error } = await supabase
      .from('processed_outputs')
      .select('*')
      .eq('id', outputId)
      .single();

    if (error || !output) {
      return Response.json({ error: 'Output not found' }, { status: 404 });
    }

    // Verify ownership through the image record
    const { data: image } = await supabase
      .from('images')
      .select('user_id')
      .eq('id', output.image_id)
      .single();

    if (!image || image.user_id !== user.id) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Download from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('printprep-images')
      .download(output.storage_path);

    if (downloadError || !fileData) {
      return Response.json({ error: 'File not found in storage' }, { status: 404 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const contentType = output.format === 'png' ? 'image/png' : 'image/jpeg';

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${output.filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('Download error:', err);
    return Response.json({ error: 'Download failed' }, { status: 500 });
  }
}
