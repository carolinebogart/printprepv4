import { createClient } from '@/lib/supabase/server';
import { getImageInfo } from '@/lib/image-processor';
import { getRatiosForOrientation } from '@/lib/output-sizes';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // seconds

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tiff', 'webp', 'bmp'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PIXELS = 65_000_000; // ~8062×8062 — any legitimate print source fits within this

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
      return NextResponse.json({ error: 'File exceeds 50MB limit' }, { status: 400 });
    }

    // Extract metadata
    const metadata = await getImageInfo(buffer);

    // Validate pixel dimensions
    const totalPixels = metadata.width * metadata.height;
    if (totalPixels > MAX_PIXELS) {
      const maxDim = Math.round(Math.sqrt(MAX_PIXELS));
      return NextResponse.json(
        { error: `Image is too large (${metadata.width}×${metadata.height} = ${Math.round(totalPixels / 1e6)}MP). Maximum is ~${maxDim}×${maxDim} pixels (65MP). Please resize your image before uploading.` },
        { status: 400 }
      );
    }

    // Generate unique filename and upload
    const imageId = crypto.randomUUID();
    const storagePath = `${user.id}/${imageId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('printprep-images')
      .upload(storagePath, buffer, {
        contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // Create image record
    const { error: dbError } = await supabase.from('images').insert({
      id: imageId,
      user_id: user.id,
      original_filename: file.name,
      storage_path: storagePath,
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
