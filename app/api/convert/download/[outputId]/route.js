import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONTENT_TYPES = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  tiff: 'image/tiff',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

export async function GET(request, { params }) {
  try {
    const { outputId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'authentication_required' }, { status: 401 });
    }

    const { data: output, error } = await supabase
      .from('conversion_outputs')
      .select('*')
      .eq('id', outputId)
      .eq('user_id', user.id)
      .single();

    if (error || !output) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('printprep-images')
      .download(output.storage_path);

    if (downloadError || !fileData) {
      return Response.json({ error: 'not_found', message: 'File not found in storage.' }, { status: 404 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const contentType = CONTENT_TYPES[output.output_format] || 'application/octet-stream';

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${output.filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('Conversion download error:', err);
    return Response.json({ error: 'processing_error' }, { status: 500 });
  }
}
