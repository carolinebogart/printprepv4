import { createServerClient } from '../../../../lib/supabase/server.js';
import archiver from 'archiver';

export async function GET(request, { params }) {
  try {
    const { imageId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify image ownership
    const { data: image } = await supabase
      .from('images')
      .select('user_id')
      .eq('id', imageId)
      .single();

    if (!image || image.user_id !== user.id) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch all outputs for this image
    const { data: outputs, error } = await supabase
      .from('processed_outputs')
      .select('*')
      .eq('image_id', imageId)
      .eq('status', 'completed');

    if (error || !outputs || outputs.length === 0) {
      return Response.json({ error: 'No outputs found' }, { status: 404 });
    }

    // Create ZIP archive using a ReadableStream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Build the zip in the background
    const zipPromise = (async () => {
      const archive = archiver('zip', { zlib: { level: 5 } });

      archive.on('data', (chunk) => writer.write(chunk));
      archive.on('end', () => writer.close());
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        writer.abort(err);
      });

      // Download each file and add to archive
      for (const output of outputs) {
        try {
          const { data: fileData } = await supabase.storage
            .from('printprep-images')
            .download(output.storage_path);

          if (fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            archive.append(buffer, { name: output.filename });
          }
        } catch (err) {
          console.error(`Failed to add ${output.filename} to zip:`, err);
          // Continue with other files
        }
      }

      archive.finalize();
    })();

    // Don't await — let it stream
    zipPromise.catch((err) => console.error('ZIP generation error:', err));

    const zipFilename = `printprep_outputs_${imageId.slice(0, 8)}.zip`;

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    console.error('ZIP download error:', err);
    return Response.json({ error: 'ZIP download failed' }, { status: 500 });
  }
}
