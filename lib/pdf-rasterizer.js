/**
 * PDF rasterization using pdfjs-dist + node-canvas.
 * Used only in server-side API routes (never imported in client components).
 */

const MAX_PDF_PAGES = 20;

// Lazily import to avoid issues at module load time in Next.js
async function getPdfJs() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Disable web worker — we're running server-side
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  return pdfjsLib;
}

async function getCanvas() {
  const { createCanvas } = await import('canvas');
  return createCanvas;
}

class NodeCanvasFactory {
  constructor(createCanvas) {
    this._createCanvas = createCanvas;
  }
  create(width, height) {
    const canvas = this._createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

/**
 * Return the number of pages in a PDF buffer (capped at MAX_PDF_PAGES).
 * @param {Buffer} pdfBuffer
 * @returns {Promise<number>}
 */
export async function getPdfPageCount(pdfBuffer) {
  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;
  const count = Math.min(pdf.numPages, MAX_PDF_PAGES);
  await pdf.destroy();
  return count;
}

/**
 * Rasterize a single PDF page to a PNG Buffer.
 * @param {Buffer} pdfBuffer
 * @param {number} pageNum  1-based page number
 * @param {number} scale    Render scale (1.0 = 72 DPI, 2.083 ≈ 150 DPI)
 * @returns {Promise<Buffer>}  PNG buffer
 */
export async function rasterizePdfPage(pdfBuffer, pageNum, scale = 2.083) {
  const [pdfjsLib, createCanvas] = await Promise.all([getPdfJs(), getCanvas()]);
  const canvasFactory = new NodeCanvasFactory(createCanvas);

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;

  if (pageNum < 1 || pageNum > pdf.numPages) {
    await pdf.destroy();
    throw new Error(`Page ${pageNum} out of range (PDF has ${pdf.numPages} pages)`);
  }

  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const w = Math.ceil(viewport.width);
  const h = Math.ceil(viewport.height);

  const canvasAndContext = canvasFactory.create(w, h);

  await page.render({
    canvasContext: canvasAndContext.context,
    viewport,
    canvasFactory,
  }).promise;

  const pngBuffer = canvasAndContext.canvas.toBuffer('image/png');

  canvasFactory.destroy(canvasAndContext);
  page.cleanup();
  await pdf.destroy();

  return pngBuffer;
}

/**
 * Render thumbnail-sized PNG for each page of a PDF.
 * @param {Buffer} pdfBuffer
 * @param {number} thumbWidth  Target thumbnail width in pixels (height is proportional)
 * @returns {Promise<Buffer[]>}  Array of PNG buffers, one per page (up to MAX_PDF_PAGES)
 */
export async function getPdfPageThumbnails(pdfBuffer, thumbWidth = 400) {
  const pdfjsLib = await getPdfJs();
  const createCanvas = await getCanvas();
  const canvasFactory = new NodeCanvasFactory(createCanvas);

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const thumbnails = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1.0 });
    const scale = thumbWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const w = Math.ceil(viewport.width);
    const h = Math.ceil(viewport.height);

    const canvasAndContext = canvasFactory.create(w, h);

    await page.render({
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
    }).promise;

    const pngBuffer = canvasAndContext.canvas.toBuffer('image/png');
    thumbnails.push(pngBuffer);

    canvasFactory.destroy(canvasAndContext);
    page.cleanup();
  }

  await pdf.destroy();
  return thumbnails;
}

export { MAX_PDF_PAGES };
