import { createServerClient } from '@/lib/supabase/server';
import { rasterizePdfPage } from '@/lib/pdf-rasterizer';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const ALLOWED_OUTPUT_FORMATS = ['jpg', 'jpeg', 'png', 'tiff', 'webp', 'gif', 'pdf'];

const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  tiff: 'image/tiff',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

/**
 * Convert an image buffer to the target format using Sharp.
 * For PDF output, use pdf-lib to embed the image.
 */
async function convertBuffer(srcBuffer, srcFormat, targetFormat) {
  const fmt = targetFormat === 'jpg' ? 'jpeg' : targetFormat;

  if (fmt === 'pdf') {
    // Convert to PNG first (pdf-lib supports JPG and PNG natively)
    let embedBuffer = srcBuffer;
    let embedAsPng = true;
    if (srcFormat === 'jpeg' || srcFormat === 'jpg') {
      embedBuffer = srcBuffer;
      embedAsPng = false;
    } else {
      embedBuffer = await sharp(srcBuffer).png().toBuffer();
      embedAsPng = true;
    }

    const pdfDoc = await PDFDocument.create();
    const image = embedAsPng
      ? await pdfDoc.embedPng(embedBuffer)
      : await pdfDoc.embedJpg(embedBuffer);
    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // Image → image via Sharp
  const pipeline = sharp(srcBuffer);
  if (fmt === 'jpeg') {
    // Flatten transparency to white for JPG/GIF (alpha not supported)
    return pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
  }
  if (fmt === 'gif') {
    // GIF has no transparency support for semi-transparent pixels; flatten to white
    return pipeline.flatten({ background: '#ffffff' }).gif().toBuffer();
  }
  if (fmt === 'png') return pipeline.png().toBuffer();
  if (fmt === 'tiff') return pipeline.tiff({ quality: 90 }).toBuffer();
  if (fmt === 'webp') return pipeline.webp({ quality: 90 }).toBuffer();

  throw new Error(`Unsupported output format: ${targetFormat}`);
}

function outputFilename(originalFilename, outputFormat, pageNumber) {
  const basename = originalFilename.replace(/\.[^.]+$/, '');
  const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
  if (pageNumber != null) {
    return `${basename}-p${pageNumber}.${ext}`;
  }
  return `${basename}.${ext}`;
}

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'authentication_required' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, outputFormats, selectedPages } = body;

    if (!jobId || !Array.isArray(outputFormats) || outputFormats.length === 0) {
      return Response.json({ error: 'invalid_file', message: 'Missing jobId or outputFormats.' }, { status: 400 });
    }

    const invalidFormat = outputFormats.find((f) => !ALLOWED_OUTPUT_FORMATS.includes(f));
    if (invalidFormat) {
      return Response.json({ error: 'invalid_file', message: `Invalid output format: ${invalidFormat}` }, { status: 400 });
    }

    // Fetch and verify job ownership
    const { data: job, error: jobError } = await supabase
      .from('conversion_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return Response.json({ error: 'not_found', message: 'Conversion job not found.' }, { status: 404 });
    }

    if (job.status === 'completed') {
      return Response.json({ error: 'invalid_file', message: 'Job already completed.' }, { status: 400 });
    }

    // Mark processing
    await supabase.from('conversion_jobs').update({ status: 'processing' }).eq('id', jobId);

    // Download original from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('printprep-images')
      .download(job.storage_path);

    if (downloadError || !fileData) {
      return Response.json({ error: 'not_found', message: 'Original file not found.' }, { status: 404 });
    }

    const originalBuffer = Buffer.from(await fileData.arrayBuffer());
    const isPdf = job.source_format === 'pdf';

    // Determine pages to process
    let pagesToProcess = [null]; // null = not a PDF (single image)
    if (isPdf) {
      const allPages = Array.from({ length: job.page_count }, (_, i) => i + 1);
      pagesToProcess = Array.isArray(selectedPages) && selectedPages.length > 0
        ? selectedPages.filter((p) => p >= 1 && p <= job.page_count)
        : allPages;
    }

    const outputs = [];
    let anySuccess = false;

    for (const pageNum of pagesToProcess) {
      // Rasterize PDF page to PNG if needed
      let srcBuffer = originalBuffer;
      let srcFormat = job.source_format;
      if (isPdf) {
        try {
          srcBuffer = await rasterizePdfPage(originalBuffer, pageNum);
          srcFormat = 'png';
        } catch (err) {
          console.error(`Failed to rasterize page ${pageNum}:`, err);
          continue;
        }
      }

      for (const fmt of outputFormats) {
        try {
          const convertedBuffer = await convertBuffer(srcBuffer, srcFormat, fmt);
          const filename = outputFilename(job.original_filename, fmt, isPdf ? pageNum : null);
          const storagePath = `${user.id}/conversions/outputs/${jobId}/${filename}`;

          const { error: uploadError } = await supabase.storage
            .from('printprep-images')
            .upload(storagePath, convertedBuffer, {
              contentType: CONTENT_TYPES[fmt] || 'application/octet-stream',
              upsert: false,
            });

          if (uploadError) {
            console.error(`Upload failed for ${filename}:`, uploadError.message);
            continue;
          }

          const { data: outputRecord, error: dbError } = await supabase
            .from('conversion_outputs')
            .insert({
              job_id: jobId,
              user_id: user.id,
              output_format: fmt === 'jpg' ? 'jpeg' : fmt,
              page_number: isPdf ? pageNum : null,
              storage_path: storagePath,
              filename,
              file_size: convertedBuffer.length,
            })
            .select('id')
            .single();

          if (dbError) {
            console.error(`DB insert failed for ${filename}:`, dbError.message);
            continue;
          }

          outputs.push({
            id: outputRecord.id,
            outputFormat: fmt === 'jpg' ? 'jpeg' : fmt,
            pageNumber: isPdf ? pageNum : null,
            filename,
          });
          anySuccess = true;
        } catch (err) {
          console.error(`Conversion failed (page ${pageNum}, format ${fmt}):`, err);
        }
      }
    }

    const finalStatus = anySuccess ? 'completed' : 'failed';
    await supabase.from('conversion_jobs').update({ status: finalStatus }).eq('id', jobId);

    if (!anySuccess) {
      return Response.json({ error: 'processing_error', message: 'All conversions failed.' }, { status: 500 });
    }

    return Response.json({ outputs, total: outputs.length });
  } catch (err) {
    console.error('Conversion process error:', err);
    return Response.json({ error: 'processing_error', message: 'Something went wrong.' }, { status: 500 });
  }
}
