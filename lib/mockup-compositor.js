import sharp from 'sharp';

/**
 * Generate a mockup composite: artwork placed into a scene with optional frame and mat.
 *
 * Layer order (bottom to top):
 *   1. Scene background
 *   2. Frame (assembled from texture strip)
 *   3. Mat (programmatic solid border)
 *   4. Artwork
 *
 * @param {Object} params
 * @param {Buffer} params.artworkBuffer      - The processed output image buffer
 * @param {number} params.artworkWidthPx     - Artwork width in pixels (at 300 DPI)
 * @param {number} params.artworkHeightPx    - Artwork height in pixels (at 300 DPI)
 * @param {Buffer} params.sceneBuffer        - Scene background image buffer
 * @param {Object} params.scene              - Scene DB record
 * @param {Buffer|null} params.frameBuffer   - Frame texture strip buffer, or null for no frame
 * @param {Object|null} params.frame         - Frame DB record, or null for no frame
 * @param {string|null} params.matColor      - Mat hex color (e.g. '#FFFFFF'), or null for no mat
 * @param {number|null} params.matThicknessPx - Mat thickness in scene pixels, or null for no mat
 * @returns {Promise<Buffer>} JPEG buffer of the final composite
 */
export async function generateMockup({
  artworkBuffer,
  artworkWidthPx,
  artworkHeightPx,
  sceneBuffer,
  scene,
  frameBuffer,
  frame,
  matColor,
  matThicknessPx,
}) {
  // --- Step 1: Calculate real-world scale ---
  // px_per_inch in the scene image, derived from the reference object
  const pxPerInch = scene.reference_object_px / scene.reference_object_inches;

  // Artwork physical dimensions in inches (at 300 DPI)
  const artworkInchesWide = artworkWidthPx / 300;
  const artworkInchesToll = artworkHeightPx / 300;

  // Target artwork size in scene pixels
  let targetW = Math.round(artworkInchesWide * pxPerInch);
  let targetH = Math.round(artworkInchesToll * pxPerInch);

  // Clamp to frame bounding box if artwork is larger than the scene's designated area
  const maxW = scene.frame_area_width - (frame ? frame.thickness_px * 2 : 0) - (matThicknessPx ? matThicknessPx * 2 : 0);
  const maxH = scene.frame_area_height - (frame ? frame.thickness_px * 2 : 0) - (matThicknessPx ? matThicknessPx * 2 : 0);

  if (targetW > maxW || targetH > maxH) {
    const scaleW = maxW / targetW;
    const scaleH = maxH / targetH;
    const scale = Math.min(scaleW, scaleH);
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }

  // --- Step 2: Resize artwork to target scene dimensions ---
  let artworkResized = await sharp(artworkBuffer)
    .resize(targetW, targetH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  // --- Step 3: Apply mat (programmatic border) ---
  if (matColor && matThicknessPx) {
    const matRgb = hexToRgb(matColor);
    artworkResized = await sharp(artworkResized)
      .extend({
        top: matThicknessPx,
        bottom: matThicknessPx,
        left: matThicknessPx,
        right: matThicknessPx,
        background: { ...matRgb, alpha: 255 },
      })
      .png()
      .toBuffer();
  }

  // Dimensions after mat
  const mattedMeta = await sharp(artworkResized).metadata();
  const mattedW = mattedMeta.width;
  const mattedH = mattedMeta.height;

  // --- Step 4: Assemble frame around matted artwork ---
  let framedBuffer = artworkResized;
  let framedW = mattedW;
  let framedH = mattedH;

  if (frameBuffer && frame) {
    framedBuffer = await assembleFrame(artworkResized, mattedW, mattedH, frameBuffer, frame.thickness_px);
    framedW = mattedW + frame.thickness_px * 2;
    framedH = mattedH + frame.thickness_px * 2;
  }

  // --- Step 5: Calculate placement on scene ---
  // Center of framed artwork, offset by scene nudge values
  const centerX = scene.placement_x + (scene.offset_x ?? 0);
  const centerY = scene.placement_y + (scene.offset_y ?? 0);

  const left = Math.round(centerX - framedW / 2);
  const top = Math.round(centerY - framedH / 2);

  // Clamp to scene bounds
  const clampedLeft = Math.max(0, Math.min(left, scene.width - framedW));
  const clampedTop = Math.max(0, Math.min(top, scene.height - framedH));

  // --- Step 6: Composite onto scene ---
  const result = await sharp(sceneBuffer)
    .composite([{ input: framedBuffer, left: clampedLeft, top: clampedTop }])
    .jpeg({ quality: 92 })
    .toBuffer();

  return result;
}

/**
 * Assemble a picture frame with mitered corners and tiled sides from a single texture strip.
 *
 * The strip is a horizontal image:
 *   - Corner tiles: thickness × thickness squares taken from each end
 *   - Side tile: the middle section, tiled along each side
 *
 * Returns a PNG buffer of (innerW + thickness*2) × (innerH + thickness*2) with
 * the inner area transparent so the artwork shows through.
 *
 * @param {Buffer} artworkBuffer  - The matted artwork (PNG with alpha)
 * @param {number} innerW         - Inner opening width in px
 * @param {number} innerH         - Inner opening height in px
 * @param {Buffer} stripBuffer    - Frame texture strip buffer
 * @param {number} thickness      - Frame thickness in px
 * @returns {Promise<Buffer>} PNG buffer of frame composited over artwork
 */
async function assembleFrame(artworkBuffer, innerW, innerH, stripBuffer, thickness) {
  const outerW = innerW + thickness * 2;
  const outerH = innerH + thickness * 2;

  // Resize strip to have the correct height (thickness)
  const stripResized = await sharp(stripBuffer)
    .resize(null, thickness, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const stripMeta = await sharp(stripResized).metadata();
  const stripW = stripMeta.width;

  // Extract a corner tile (leftmost thickness×thickness square)
  const cornerTile = await sharp(stripResized)
    .extract({ left: 0, top: 0, width: Math.min(thickness, stripW), height: thickness })
    .resize(thickness, thickness, { fit: 'fill' })
    .png()
    .toBuffer();

  // Extract side tile (use full strip width; will be tiled)
  const sideTile = stripResized;

  // Build the 4 corners by rotating the corner tile
  const cornerTL = cornerTile; // 0° — top-left
  const cornerTR = await sharp(cornerTile).rotate(90).png().toBuffer();   // top-right
  const cornerBR = await sharp(cornerTile).rotate(180).png().toBuffer();  // bottom-right
  const cornerBL = await sharp(cornerTile).rotate(270).png().toBuffer();  // bottom-left

  // Tile the side strip horizontally to cover top/bottom edges (innerW wide)
  const topSide = await tileSideH(sideTile, innerW, thickness);
  const bottomSide = topSide; // same tile, same width

  // Tile the side strip vertically (rotate 90°) to cover left/right edges (innerH tall)
  const leftSide = await tileSideV(sideTile, innerH, thickness);
  const rightSide = leftSide;

  // Compose all pieces onto a transparent canvas
  const composites = [
    // Artwork goes behind — placed at offset (thickness, thickness)
    { input: artworkBuffer, left: thickness, top: thickness },
    // Sides
    { input: topSide,    left: thickness, top: 0 },
    { input: bottomSide, left: thickness, top: outerH - thickness },
    { input: leftSide,   left: 0,         top: thickness },
    { input: rightSide,  left: outerW - thickness, top: thickness },
    // Corners (on top of sides)
    { input: cornerTL, left: 0,              top: 0 },
    { input: cornerTR, left: outerW - thickness, top: 0 },
    { input: cornerBR, left: outerW - thickness, top: outerH - thickness },
    { input: cornerBL, left: 0,              top: outerH - thickness },
  ];

  return sharp({
    create: { width: outerW, height: outerH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

/**
 * Tile a strip horizontally to fill targetWidth × thickness.
 */
async function tileSideH(stripBuffer, targetWidth, thickness) {
  const meta = await sharp(stripBuffer).metadata();
  const tileW = meta.width;

  if (tileW >= targetWidth) {
    // Just crop to width
    return sharp(stripBuffer)
      .extract({ left: 0, top: 0, width: targetWidth, height: thickness })
      .png()
      .toBuffer();
  }

  // Tile by compositing repeated copies
  const tiles = [];
  let x = 0;
  while (x < targetWidth) {
    const copyW = Math.min(tileW, targetWidth - x);
    const tile = await sharp(stripBuffer)
      .extract({ left: 0, top: 0, width: copyW, height: thickness })
      .png()
      .toBuffer();
    tiles.push({ input: tile, left: x, top: 0 });
    x += copyW;
  }

  return sharp({
    create: { width: targetWidth, height: thickness, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(tiles)
    .png()
    .toBuffer();
}

/**
 * Tile a strip vertically to fill thickness × targetHeight.
 * Rotates the strip 90° and tiles it.
 */
async function tileSideV(stripBuffer, targetHeight, thickness) {
  // Rotate strip 90° so it runs vertically
  const rotated = await sharp(stripBuffer).rotate(90).png().toBuffer();
  const meta = await sharp(rotated).metadata();
  const tileH = meta.height;

  if (tileH >= targetHeight) {
    return sharp(rotated)
      .extract({ left: 0, top: 0, width: thickness, height: targetHeight })
      .png()
      .toBuffer();
  }

  const tiles = [];
  let y = 0;
  while (y < targetHeight) {
    const copyH = Math.min(tileH, targetHeight - y);
    const tile = await sharp(rotated)
      .extract({ left: 0, top: 0, width: thickness, height: copyH })
      .png()
      .toBuffer();
    tiles.push({ input: tile, left: 0, top: y });
    y += copyH;
  }

  return sharp({
    create: { width: thickness, height: targetHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(tiles)
    .png()
    .toBuffer();
}

/**
 * Convert hex color string to RGB object.
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}
