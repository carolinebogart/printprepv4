import sharp from 'sharp';
import { generateOutputFilename } from './output-sizes.js';

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
 * Core crop + resize algorithm.
 * Handles negative crop coordinates (image doesn't fill crop box = padding).
 *
 * @param {Buffer} originalBuffer - Original image buffer
 * @param {{ x: number, y: number, width: number, height: number }} cropData - Crop box coords (can be negative)
 * @param {number} targetWidthInches - Output width in inches
 * @param {number} targetHeightInches - Output height in inches
 * @param {number} dpi - Output DPI (default 300)
 * @param {string} backgroundColor - 'transparent' or hex string like '#FFFFFF'
 * @param {boolean} useShadow - Add drop shadow when padding
 * @returns {Promise<{ buffer: Buffer, format: 'png' | 'jpeg' }>}
 */
export async function applyCropAndResize(
  originalBuffer,
  cropData,
  targetWidthInches,
  targetHeightInches,
  dpi = 300,
  backgroundColor = '#FFFFFF',
  useShadow = false
) {
  const metadata = await sharp(originalBuffer).metadata();
  const imgWidth = metadata.width;
  const imgHeight = metadata.height;

  // Step 1: Calculate intersection of crop box with actual image
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

  // Step 3: Target dimensions in pixels
  const targetWidthPx = Math.round(targetWidthInches * dpi);
  const targetHeightPx = Math.round(targetHeightInches * dpi);

  const useTransparency = backgroundColor === 'transparent';
  const format = useTransparency ? 'png' : 'jpeg';

  // Step 2: Extract (crop) available portion from original
  const cropped = sharp(originalBuffer).extract({
    left: actualX,
    top: actualY,
    width: croppedWidth,
    height: croppedHeight,
  });

  // Step 4: Check if image fills the crop box
  const scaleX = croppedWidth / cropW;
  const scaleY = croppedHeight / cropH;
  const fillsBox = Math.min(scaleX, scaleY) >= 0.99;

  // Determine if we're upscaling (target is larger than source crop)
  const isUpscaling = targetWidthPx > croppedWidth || targetHeightPx > croppedHeight;

  if (fillsBox) {
    // Step 5a: Image fills crop box — direct resize with Lanczos3
    let pipeline = cropped
      .resize(targetWidthPx, targetHeightPx, { fit: 'fill', kernel: sharp.kernel.lanczos3 });

    // Apply sharpening for upscaled images to counteract softness
    if (isUpscaling) {
      pipeline = pipeline.sharpen({ sigma: 0.8, m1: 1.0, m2: 0.5 });
    }

    pipeline = pipeline.withMetadata({ density: dpi });

    if (format === 'png') {
      return { buffer: await pipeline.png().toBuffer(), format: 'png' };
    }
    return { buffer: await pipeline.jpeg({ quality: 95 }).toBuffer(), format: 'jpeg' };
  }

  // Step 5b: Padding needed — create canvas and composite
  const outputImgWidth = Math.max(1, Math.round(croppedWidth * (targetWidthPx / cropW)));
  const outputImgHeight = Math.max(1, Math.round(croppedHeight * (targetHeightPx / cropH)));

  let resizedPipeline = cropped
    .resize(outputImgWidth, outputImgHeight, { kernel: sharp.kernel.lanczos3 });

  // Apply sharpening for upscaled images
  if (isUpscaling) {
    resizedPipeline = resizedPipeline.sharpen({ sigma: 0.8, m1: 1.0, m2: 0.5 });
  }

  const resizedImage = await resizedPipeline.toBuffer();

  // Calculate paste position based on how far crop extends beyond image
  const offsetX = cropX < 0 ? (actualX - cropX) : 0;
  const offsetY = cropY < 0 ? (actualY - cropY) : 0;
  const pasteX = Math.round(offsetX * (targetWidthPx / cropW));
  const pasteY = Math.round(offsetY * (targetHeightPx / cropH));

  const bgColor = useTransparency
    ? { r: 255, g: 255, b: 255, alpha: 0 }
    : { ...hexToRgb(backgroundColor), alpha: 255 };

  // Create background canvas
  const canvas = sharp({
    create: {
      width: targetWidthPx,
      height: targetHeightPx,
      channels: useTransparency ? 4 : 3,
      background: bgColor,
    },
  });

  const composites = [];

  // Optional drop shadow
  if (useShadow) {
    const shadowOffsetX = 10;
    const shadowOffsetY = 10;
    const shadowBlur = 20;

    // Ensure shadow doesn't overflow canvas
    const shadowLeft = Math.min(pasteX + shadowOffsetX, targetWidthPx - outputImgWidth);
    const shadowTop = Math.min(pasteY + shadowOffsetY, targetHeightPx - outputImgHeight);

    try {
      const shadowLayer = await sharp({
        create: {
          width: outputImgWidth,
          height: outputImgHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 128 },
        },
      })
        .blur(Math.max(shadowBlur, 0.3))
        .png()
        .toBuffer();

      composites.push({
        input: shadowLayer,
        left: Math.max(0, shadowLeft),
        top: Math.max(0, shadowTop),
      });
    } catch {
      // Shadow creation failed — skip it, still produce the image
    }
  }

  composites.push({
    input: resizedImage,
    left: Math.max(0, pasteX),
    top: Math.max(0, pasteY),
  });

  const pipeline = canvas.composite(composites).withMetadata({ density: dpi });

  if (format === 'png') {
    return { buffer: await pipeline.png().toBuffer(), format: 'png' };
  }
  return { buffer: await pipeline.jpeg({ quality: 95 }).toBuffer(), format: 'jpeg' };
}

/**
 * Process all selected ratios/sizes for one image.
 * Returns array of results; continues on error (doesn't fail entire batch).
 *
 * @param {Buffer} originalBuffer - Original image buffer
 * @param {Array<{ ratioKey, cropData, sizes, backgroundColor, useShadow }>} ratioConfigs
 * @param {number} dpi
 * @returns {Promise<Array<{ ratioKey, sizeLabel, filename, buffer, format, success, error? }>>}
 */
export async function processAllCrops(originalBuffer, ratioConfigs, dpi = 300) {
  const results = [];

  for (const config of ratioConfigs) {
    const { ratioKey, cropData, sizes, backgroundColor = '#FFFFFF', useShadow = false } = config;

    for (const size of sizes) {
      try {
        const { buffer, format } = await applyCropAndResize(
          originalBuffer,
          cropData,
          size.width,
          size.height,
          dpi,
          backgroundColor,
          useShadow
        );

        const filename = generateOutputFilename(
          ratioKey,
          size.width,
          size.height,
          dpi,
          format
        );

        results.push({
          ratioKey,
          sizeLabel: size.label,
          filename,
          buffer,
          format,
          success: true,
        });
      } catch (error) {
        results.push({
          ratioKey,
          sizeLabel: size.label,
          filename: null,
          buffer: null,
          format: null,
          success: false,
          error: error.message,
        });
      }
    }
  }

  return results;
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
