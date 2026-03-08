import { createClient } from '@/lib/supabase/server';
import { getImageInfo } from '@/lib/image-processor';
import { getRatiosForOrientation } from '@/lib/output-sizes';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { Upload } from 'tus-js-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // seconds
export const maxRequestBodySize = '400mb';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tiff', 'webp', 'bmp'];
const MAX_FILE_SIZE = 400 * 1024 * 1024; // 400MB
const MAX_PIXELS = 260_000_000; // ~14,400×18,000 — covers 14400×18000 at 300 DPI

export async function POST(request) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const creditsRemaining = subscription
      ? Math.max(0, subscription.credits_total - subscription.credits_used)
      : 0;
    const isActive = subscription?.status === 'active' ||
      (subscription?.status === 'cancelled' && creditsRemaining > 0);

    if (!isActive || creditsRemaining <= 0) {
      return NextResponse.json(
        { error: 'No active subscription or credits remaining' },
        { status: 403 }
      );
    }

    // Parse form data — can fail on very large files
    let formData;
    try {
      formData = await request.formData();
    } catch (parseErr) {
      console.error('FormData parse error:', parseErr?.message);
      return NextResponse.json(
        { error: 'File too large to upload. Please try a smaller file (under 25MB) or compress it first.' },
        { status: 413 }
      );
    }
    const file = formData.get('file');

    if (!file || !file.name) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate size
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 400MB limit' }, { status: 400 });
    }

    // Extract metadata
    const metadata = await getImageInfo(buffer);

    // Validate pixel dimensions
    const totalPixels = metadata.width * metadata.height;
    if (totalPixels > MAX_PIXELS) {
      const maxDim = Math.round(Math.sqrt(MAX_PIXELS));
      return NextResponse.json(
        { error: `Image is too large (${metadata.width}×${metadata.height} = ${Math.round(totalPixels / 1e6)}MP). Maximum is 260MP (14,400×18,000 px). Please resize your image before uploading.` },
        { status: 400 }
      );
    }

    // Generate unique filename and upload
    const imageId = crypto.randomUUID();
    const storagePath = `${user.id}/${imageId}.${ext}`;

    // Use TUS resumable upload — required for large files (standard upload has a size cap)
    const { data: { session } } = await supabase.auth.getSession();
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0];

    await new Promise((resolve, reject) => {
      const upload = new Upload(buffer, {
        endpoint: `https://${projectRef}.supabase.co/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          'x-upsert': 'false',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: 'printprep-images',
          objectName: storagePath,
          contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks — required by Supabase TUS
        onError: (err) => {
          console.error('Storage upload error:', err);
          reject(err);
        },
        onSuccess: () => resolve(),
      });
      upload.start();
    });

    // Generate small thumbnail (persists after file expiry for history view)
    let thumbnailPath = null;
    try {
      const thumbBuffer = await sharp(buffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      thumbnailPath = `${user.id}/thumbnails/${imageId}.jpg`;
      const { error: thumbErr } = await supabase.storage
        .from('printprep-images')
        .upload(thumbnailPath, thumbBuffer, { contentType: 'image/jpeg', upsert: false });
      if (thumbErr) {
        console.warn('Thumbnail upload failed:', thumbErr.message);
        thumbnailPath = null;
      }
    } catch (thumbErr) {
      console.warn('Thumbnail generation failed:', thumbErr?.message);
    }

    // Create image record
    const { error: dbError } = await supabase.from('images').insert({
      id: imageId,
      user_id: user.id,
      original_filename: file.name,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      width: metadata.width,
      height: metadata.height,
      aspect_ratio: metadata.aspectRatio,
      format: metadata.format,
      orientation: metadata.orientation,
      file_size: buffer.length,
    });

    if (dbError) {
      console.error('DB insert error:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('printprep-images').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to save image record' }, { status: 500 });
    }

    // Get available ratios for this orientation
    const ratios = getRatiosForOrientation(metadata.orientation);

    return NextResponse.json({
      imageId,
      metadata,
      ratios: Object.entries(ratios).map(([key, val]) => ({
        key,
        name: val.name,
        ratio: val.ratio,
        sizes: val.sizes,
      })),
    });
  } catch (error) {
    console.error('Upload error:', error?.message, error?.stack);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
