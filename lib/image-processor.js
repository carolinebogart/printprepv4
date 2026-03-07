import sharp from 'sharp';
import { generateOutputFilename } from './output-sizes.js';

// Limit Sharp/libvips to 1 thread to reduce memory pressure on constrained containers
sharp.concurrency(1);

// Max pixels for a single output buffer.
// 14,400×18,000 at 300 DPI = 259.2MP — raised to support largest expected output.
const MAX_PIXELS = 260_000_000;

// Convert hex color string to RGB object
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Extract the crop region from the original image once.
 * Returns the cropped buffer + geometry info needed for resize steps.
 * This avoids re-decoding the full original for every output size.
 */
export async function extractCrop(originalBuffer, cropData) {
  const metadata = await sharp(originalBuffer).metadata();
  const imgWidth = metadata.width;
  const imgHeight = metadata.height;

  const cropX = Math.round(cropData.x);
  const cropY = Math.round(cropData.y);
  const cropW = Math.round(cropData.width);
  const cropH = Math.round(cropData.height);

  const actualX = Math.max(0, cropX);
  const actualY = Math.max(0, cropY);
  const actualX2 = Math.min(imgWidth, cropX + cropW);
  const actualY2 = Math.min(imgHeight, cropY + cropH);
  const croppedWidth = Math.max(1, actualX2 - actualX);
  const croppedHeight = Math.max(1, actualY2 - actualY);

  // Extract once to a JPEG or PNG buffer depending on source transparency.
  // If source has alpha channel, preserve it as PNG; otherwise use JPEG for smaller size.
  const sourceHasAlpha = metadata.hasAlpha === true;
  const croppedBuffer = await sharp(originalBuffer)
    .extract({ left: actualX, top: actualY, width: croppedWidth, height: croppedHeight })
    [sourceHasAlpha ? 'png' : 'jpeg'](...(sourceHasAlpha ? [] : [{ quality: 98 }]))
    .toBuffer();

  const scaleX = croppedWidth / cropW;
  const scaleY = croppedHeight / cropH;
  const fillsBox = Math.min(scaleX, scaleY) >= 0.99;

  // Padding offsets (for when image doesn't fill crop box)
  const offsetX = cropX < 0 ? (actualX - cropX) : 0;
  const offsetY = cropY < 0 ? (actualY - cropY) : 0;

  return {
    croppedBuffer,
    croppedWidth,
    croppedHeight,
    cropW,
    cropH,
    fillsBox,
    offsetX,
    offsetY,
  };
}

/**
 * Resize a pre-cropped buffer to one target size.
 * Uses the crop geometry from extractCrop to handle padding correctly.
 */
export async function resizeToTarget(
  cropResult,
  targetWidthInches,
  targetHeightInches,
  dpi = 300,
  backgroundColor = '#FFFFFF',
  useShadow = false
) {
  const { croppedBuffer, croppedWidth, croppedHeight, cropW, cropH, fillsBox, offsetX, offsetY } = cropResult;

  let targetWidthPx = Math.round(targetWidthInches * dpi);
  let targetHeightPx = Math.round(targetHeightInches * dpi);

  // Safety: if the target would exceed MAX_PIXELS, scale DPI down proportionally
  const totalPixels = targetWidthPx * targetHeightPx;
  if (totalPixels > MAX_PIXELS) {
    const scale = Math.sqrt(MAX_PIXELS / totalPixels);
    targetWidthPx = Math.round(targetWidthPx * scale);
    targetHeightPx = Math.round(targetHeightPx * scale);
    dpi = Math.round(dpi * scale);
    console.log(`[sharp] Output ${targetWidthInches}x${targetHeightInches}in capped to ${targetWidthPx}x${targetHeightPx}px (effective ${dpi} DPI)`);
  }

  const useTransparency = backgroundColor === 'transparent';
  const format = useTransparency ? 'png' : 'jpeg';
  const isUpscaling = targetWidthPx > croppedWidth || targetHeightPx > croppedHeight;

  if (fillsBox) {
    // Image fills crop box — direct resize
    let pipeline = sharp(croppedBuffer)
      .resize(targetWidthPx, targetHeightPx, { fit: 'fill', kernel: sharp.kernel.lanczos3 });

    if (isUpscaling) {
      pipeline = pipeline.sharpen({ sigma: 0.8, m1: 1.0, m2: 0.5 });
    }
    pipeline = pipeline.withMetadata({ density: dpi });

    if (format === 'png') {
      return { buffer: await pipeline.png().toBuffer(), format: 'png' };
    }
    return { buffer: await pipeline.jpeg({ quality: 95 }).toBuffer(), format: 'jpeg' };
  }

  // Padding needed — resize image portion then composite onto canvas
  const outputImgWidth = Math.max(1, Math.round(croppedWidth * (targetWidthPx / cropW)));
  const outputImgHeight = Math.max(1, Math.round(croppedHeight * (targetHeightPx / cropH)));

  let resizedPipeline = sharp(croppedBuffer)
    .resize(outputImgWidth, outputImgHeight, { kernel: sharp.kernel.lanczos3 });

  if (isUpscaling) {
    resizedPipeline = resizedPipeline.sharpen({ sigma: 0.8, m1: 1.0, m2: 0.5 });
  }

  const resizedImage = await resizedPipeline.toBuffer();

  const pasteX = Math.round(offsetX * (targetWidthPx / cropW));
  const pasteY = Math.round(offsetY * (targetHeightPx / cropH));

  const bgColor = useTransparency
    ? { r: 255, g: 255, b: 255, alpha: 0 }
    : { ...hexToRgb(backgroundColor), alpha: 255 };

  const composites = [];

  // Optional drop shadow
  if (useShadow) {
    const shadowLeft = Math.min(pasteX + 10, targetWidthPx - outputImgWidth);
    const shadowTop = Math.min(pasteY + 10, targetHeightPx - outputImgHeight);

    try {
      const shadowLayer = await sharp({
        create: { width: outputImgWidth, height: outputImgHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 128 } },
      }).blur(20).png().toBuffer();

      composites.push({ input: shadowLayer, left: Math.max(0, shadowLeft), top: Math.max(0, shadowTop) });
    } catch {
      // Shadow failed — skip
    }
  }

  composites.push({ input: resizedImage, left: Math.max(0, pasteX), top: Math.max(0, pasteY) });

  const pipeline = sharp({
    create: { width: targetWidthPx, height: targetHeightPx, channels: useTransparency ? 4 : 3, background: bgColor },
  }).composite(composites).withMetadata({ density: dpi });

  if (format === 'png') {
    return { buffer: await pipeline.png().toBuffer(), format: 'png' };
  }
  return { buffer: await pipeline.jpeg({ quality: 95 }).toBuffer(), format: 'jpeg' };
}

/**
 * Upscale a cropped buffer 4× using Replicate Real-ESRGAN.
 * Call this on the croppedBuffer from extractCrop() before passing to resizeToTarget().
 * The returned buffer is a higher-resolution version of the same image region —
 * croppedWidth/croppedHeight in the cropResult stay unchanged (geometry is preserved),
 * but Sharp will have a better source to resize from.
 */
export async function upscaleCropWithAI(croppedBuffer) {
  const base64 = croppedBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;

  const response = await fetch(
    'https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
      },
      body: JSON.stringify({ input: { image: dataUri, scale: 4, face_enhance: false } }),
    }
  );

  if (!response.ok) {
    throw new Error(`Replicate request failed: ${response.status} ${response.statusText}`);
  }

  const prediction = await response.json();
  if (prediction.status === 'failed') {
    throw new Error(`Replicate upscaling failed: ${prediction.error ?? 'unknown error'}`);
  }

  const outputUrl = prediction.output;
  if (!outputUrl) {
    throw new Error('Replicate returned no output URL');
  }

  const imgResponse = await fetch(outputUrl);
  if (!imgResponse.ok) {
    throw new Error(`Failed to download upscaled image: ${imgResponse.status}`);
  }

  return Buffer.from(await imgResponse.arrayBuffer());
}

/**
 * Remove the background from an image buffer using the remove.bg API.
 * Returns a PNG buffer with transparent background.
 * Throws on API error — caller should catch and handle gracefully.
 */
const REMOVEBG_MAX_PIXELS = 50_000_000; // remove.bg 50MP input limit

export async function removeBackground(inputBuffer) {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) throw new Error('REMOVEBG_API_KEY is not configured');

  // Downsample if image exceeds remove.bg's 50MP limit
  let apiBuffer = inputBuffer;
  const meta = await sharp(inputBuffer).metadata();
  if (meta.width * meta.height > REMOVEBG_MAX_PIXELS) {
    const scale = Math.sqrt(REMOVEBG_MAX_PIXELS / (meta.width * meta.height));
    apiBuffer = await sharp(inputBuffer)
      .resize(Math.floor(meta.width * scale), Math.floor(meta.height * scale))
      .png()
      .toBuffer();
  }

  const formData = new FormData();
  formData.append('image_file', new Blob([apiBuffer]), 'image.png');
  formData.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`remove.bg API error ${response.status}: ${text}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Legacy wrapper — kept for any code that still calls it directly.
 */
export async function applyCropAndResize(
  originalBuffer, cropData, targetWidthInches, targetHeightInches,
  dpi = 300, backgroundColor = '#FFFFFF', useShadow = false
) {
  const cropResult = await extractCrop(originalBuffer, cropData);
  return resizeToTarget(cropResult, targetWidthInches, targetHeightInches, dpi, backgroundColor, useShadow);
}

/**
 * Extract image metadata from a buffer.
 * Used during upload to determine orientation and available ratios.
 */
export async function getImageInfo(buffer) {
  const metadata = await sharp(buffer).metadata();
  const { width, height, format } = metadata;
  const aspectRatio = Math.round((width / height) * 10000) / 10000;
  const orientation = width > height ? 'landscape' : 'portrait';
  return { width, height, aspectRatio, format, orientation };
}
