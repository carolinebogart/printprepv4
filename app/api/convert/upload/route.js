import { createServerClient } from '@/lib/supabase/server';
import { getRetentionDays } from '@/lib/credits';
import { getPdfPageCount, getPdfPageThumbnails, MAX_PDF_PAGES } from '@/lib/pdf-rasterizer';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tiff', 'webp', 'bmp', 'gif', 'pdf'];
const MAX_FILE_SIZE = 400 * 1024 * 1024; // 400MB

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'authentication_required' }, { status: 401 });
    }

    // Load subscription for retention calculation (no credit check — conversion is free)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .single();

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: 'file_too_large', message: 'File too large to upload.' }, { status: 413 });
    }

    const file = formData.get('file');
    if (!file || !file.name) {
      return Response.json({ error: 'invalid_file', message: 'No file provided.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return Response.json({
        error: 'invalid_file',
        message: 'Supported formats: JPG, PNG, TIFF, WebP, BMP, GIF, PDF',
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      return Response.json({ error: 'file_too_large', message: 'Maximum file size is 400 MB.' }, { status: 400 });
    }

    const jobId = crypto.randomUUID();
    const storagePath = `${user.id}/conversions/${jobId}.${ext}`;
    const isPdf = ext === 'pdf';

    // Upload original to storage
    const { error: uploadError } = await supabase.storage
      .from('printprep-images')
      .upload(storagePath, buffer, {
        contentType: isPdf ? 'application/pdf' : (file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`),
        upsert: false,
      });

    if (uploadError) {
      console.error('Conversion upload error:', uploadError);
      return Response.json({ error: 'processing_error', message: 'Failed to upload file.' }, { status: 500 });
    }

    let pageCount = 1;
    let pageThumbnailUrls = [];

    if (isPdf) {
      // Rasterize thumbnails for each page
      let thumbnailBuffers = [];
      try {
        thumbnailBuffers = await getPdfPageThumbnails(buffer, 400);
        pageCount = thumbnailBuffers.length;
      } catch (err) {
        console.error('PDF thumbnail generation failed:', err);
        // Fall back: report 1 page, no thumbnails
        pageCount = 1;
      }

      // Upload each thumbnail and collect signed URLs
      for (let i = 0; i < thumbnailBuffers.length; i++) {
        const thumbPath = `${user.id}/conversions/thumbs/${jobId}-p${i + 1}.jpg`;
        try {
          // Convert PNG thumbnail to JPEG to save space
          const jpegThumb = await sharp(thumbnailBuffers[i]).jpeg({ quality: 80 }).toBuffer();
          const { error: thumbErr } = await supabase.storage
            .from('printprep-images')
            .upload(thumbPath, jpegThumb, { contentType: 'image/jpeg', upsert: false });

          if (!thumbErr) {
            const { data: signedUrl } = await supabase.storage
              .from('printprep-images')
              .createSignedUrl(thumbPath, 3600); // 1-hour URL
            if (signedUrl?.signedUrl) {
              pageThumbnailUrls.push(signedUrl.signedUrl);
            }
          }
        } catch (thumbErr) {
          console.warn(`Thumbnail ${i + 1} failed:`, thumbErr?.message);
          pageThumbnailUrls.push(null);
        }
      }
    } else {
      // For non-PDF: get page count from PDF logic doesn't apply; just confirm it's a valid image
      try {
        const meta = await sharp(buffer).metadata();
        if (!meta.width || !meta.height) throw new Error('Unreadable image');
      } catch {
        // Clean up uploaded file
        await supabase.storage.from('printprep-images').remove([storagePath]);
        return Response.json({ error: 'invalid_file', message: 'Could not read image file.' }, { status: 400 });
      }
    }

    // Set expiry based on subscription plan (same retention tiers as print-prep)
    const retentionDays = getRetentionDays(subscription);
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase.from('conversion_jobs').insert({
      id: jobId,
      user_id: user.id,
      original_filename: file.name,
      storage_path: storagePath,
      source_format: ext === 'jpg' ? 'jpeg' : ext,
      page_count: pageCount,
      status: 'pending',
      expires_at: expiresAt,
    });

    if (dbError) {
      console.error('Conversion job DB error:', dbError);
      await supabase.storage.from('printprep-images').remove([storagePath]);
      return Response.json({ error: 'processing_error', message: 'Failed to create conversion job.' }, { status: 500 });
    }

    return Response.json({
      jobId,
      sourceFormat: ext === 'jpg' ? 'jpeg' : ext,
      pageCount,
      pageThumbnailUrls,
      originalFilename: file.name,
      retentionDays,
    });
  } catch (err) {
    console.error('Conversion upload error:', err);
    return Response.json({ error: 'processing_error', message: 'Something went wrong.' }, { status: 500 });
  }
}
