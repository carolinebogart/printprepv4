import sharp from 'sharp';
import { generateOutputFilename } from './output-sizes.js';

// Limit Sharp/libvips to 1 thread to reduce memory pressure on constrained containers
sharp.concurrency(1);

// Max pixels for a single output buffer (~200MB raw RGBA).
// Outputs exceeding this get their effective DPI reduced automatically.
const MAX_PIXELS = 50_000_000; // ~7071×7071

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

  // Extract once to a JPEG buffer (much smaller than raw pixels)
  const croppedBuffer = await sharp(originalBuffer)
    .extract({ left: actualX, top: actualY, width: croppedWidth, height: croppedHeight })
    .jpeg({ quality: 98 })
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
