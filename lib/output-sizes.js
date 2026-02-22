// All target ratios and their standard print sizes
// Appendix A from the spec

export const PORTRAIT_RATIOS = {
  '2:3': {
    ratio: 2 / 3,
    name: '2:3 Ratio',
    sizes: [
      { width: 4, height: 6, label: '4x6' },
      { width: 8, height: 12, label: '8x12' },
      { width: 16, height: 24, label: '16x24' },
      { width: 24, height: 36, label: '24x36' },
    ],
  },
  '3:4': {
    ratio: 3 / 4,
    name: '3:4 Ratio',
    sizes: [
      { width: 6, height: 8, label: '6x8' },
      { width: 9, height: 12, label: '9x12' },
      { width: 12, height: 16, label: '12x16' },
      { width: 18, height: 24, label: '18x24' },
    ],
  },
  '4:5': {
    ratio: 4 / 5,
    name: '4:5 Ratio',
    sizes: [
      { width: 4, height: 5, label: '4x5' },
      { width: 8, height: 10, label: '8x10' },
      { width: 16, height: 20, label: '16x20' },
    ],
  },
  '8:11': {
    ratio: 8 / 11,
    name: '8:11 Ratio',
    sizes: [{ width: 8, height: 11, label: '8x11' }],
  },
  'A-Series': {
    ratio: 210 / 297,
    name: 'A-Series (ISO)',
    sizes: [
      { width: 2.91, height: 4.13, label: 'A7' },
      { width: 4.13, height: 5.83, label: 'A6' },
      { width: 5.83, height: 8.27, label: 'A5' },
      { width: 8.27, height: 11.69, label: 'A4' },
      { width: 11.69, height: 16.54, label: 'A3' },
      { width: 16.54, height: 23.39, label: 'A2' },
      { width: 23.39, height: 33.11, label: 'A1' },
      { width: 33.11, height: 46.81, label: 'A0' },
    ],
  },
};

export const LANDSCAPE_RATIOS = {
  '3:2': {
    ratio: 3 / 2,
    name: '3:2 Ratio',
    sizes: [
      { width: 6, height: 4, label: '6x4' },
      { width: 12, height: 8, label: '12x8' },
      { width: 24, height: 16, label: '24x16' },
      { width: 36, height: 24, label: '36x24' },
    ],
  },
  '4:3': {
    ratio: 4 / 3,
    name: '4:3 Ratio',
    sizes: [
      { width: 8, height: 6, label: '8x6' },
      { width: 12, height: 9, label: '12x9' },
      { width: 16, height: 12, label: '16x12' },
      { width: 24, height: 18, label: '24x18' },
    ],
  },
  '5:4': {
    ratio: 5 / 4,
    name: '5:4 Ratio',
    sizes: [
      { width: 5, height: 4, label: '5x4' },
      { width: 10, height: 8, label: '10x8' },
      { width: 20, height: 16, label: '20x16' },
    ],
  },
  '11:8': {
    ratio: 11 / 8,
    name: '11:8 Ratio',
    sizes: [{ width: 11, height: 8, label: '11x8' }],
  },
  'A-Series': {
    ratio: 297 / 210,
    name: 'A-Series (ISO)',
    sizes: [
      { width: 4.13, height: 2.91, label: 'A7' },
      { width: 5.83, height: 4.13, label: 'A6' },
      { width: 8.27, height: 5.83, label: 'A5' },
      { width: 11.69, height: 8.27, label: 'A4' },
      { width: 16.54, height: 11.69, label: 'A3' },
      { width: 23.39, height: 16.54, label: 'A2' },
      { width: 33.11, height: 23.39, label: 'A1' },
      { width: 46.81, height: 33.11, label: 'A0' },
    ],
  },
};

// Get available ratios based on image orientation
export function getRatiosForOrientation(orientation) {
  return orientation === 'landscape' ? LANDSCAPE_RATIOS : PORTRAIT_RATIOS;
}

// Determine sacrifice direction when crop ratio differs from original
export function getSacrificeDirection(originalRatio, targetRatio) {
  if (Math.abs(originalRatio - targetRatio) < 0.01) return 'none';
  if (targetRatio > originalRatio) return 'horizontal';
  return 'vertical';
}

// Generate output filename per spec pattern
export function generateOutputFilename(ratioKey, widthInches, heightInches, dpi, format) {
  const timestamp = Math.floor(Date.now() / 1000);
  const widthPx = Math.round(widthInches * dpi);
  const heightPx = Math.round(heightInches * dpi);
  const widthMm = Math.round(widthInches * 25.4);
  const heightMm = Math.round(heightInches * 25.4);

  // Format ratio: "3:4" -> "3x4", "A-Series" -> size label (e.g. "a4")
  let ratioStr;
  if (ratioKey === 'A-Series') {
    // Detect A-size from dimensions (match standard A-series widths)
    const aLabels = { 2.91: 'a7', 4.13: 'a6', 5.83: 'a5', 8.27: 'a4', 11.69: 'a3', 16.54: 'a2', 23.39: 'a1', 33.11: 'a0' };
    const shortSide = Math.min(widthInches, heightInches);
    ratioStr = aLabels[shortSide] || 'a';
  } else {
    ratioStr = ratioKey.replace(':', 'x').toLowerCase();
  }

  const ext = format === 'png' ? 'png' : 'jpg';

  return `${ratioStr}-${widthInches}x${heightInches}in-${widthPx}x${heightPx}px-${widthMm}x${heightMm}mm-${timestamp}.${ext}`;
}
