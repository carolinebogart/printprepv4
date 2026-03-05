import { createServerClient } from '@/lib/supabase/server';
import archiver from 'archiver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const { jobId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'authentication_required' }, { status: 401 });
    }

    // Verify job ownership
    const { data: job } = await supabase
      .from('conversion_jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (!job || job.user_id !== user.id) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    const { data: outputs, error } = await supabase
      .from('conversion_outputs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id);

    if (error || !outputs || outputs.length === 0) {
      return Response.json({ error: 'not_found', message: 'No outputs found.' }, { status: 404 });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const zipPromise = (async () => {
      const archive = archiver('zip', { zlib: { level: 5 } });
      archive.on('data', (chunk) => writer.write(chunk));
      archive.on('end', () => writer.close());
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        writer.abort(err);
      });

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
        }
      }

      archive.finalize();
    })();

    zipPromise.catch((err) => console.error('ZIP generation error:', err));

    const zipFilename = `converted_${jobId.slice(0, 8)}.zip`;

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    console.error('Conversion ZIP download error:', err);
    return Response.json({ error: 'processing_error' }, { status: 500 });
  }
}
