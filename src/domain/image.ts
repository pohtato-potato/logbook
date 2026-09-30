export function fitSize(w: number, h: number, max: number) { const k = Math.min(1, max / Math.max(w, h)); return { w: Math.round(w * k), h: Math.round(h * k) }; }
type Canvas = OffscreenCanvas | HTMLCanvasElement;
const canvas = (w: number, h: number): Canvas => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const jpeg = (c: Canvas): Promise<Blob> => ('convertToBlob' in c ? c.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
  : new Promise((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('encode'))), 'image/jpeg', 0.85)));
/* Draws onto white, so transparent screenshots don't turn black as a JPEG. */
function drawOn(src: CanvasImageSource, w: number, h: number): Canvas {
  const c = canvas(w, h), g = c.getContext('2d') as CanvasRenderingContext2D; g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.drawImage(src, 0, 0, w, h); return c;
}
/* One photo, decoded once (respecting its own orientation): a 1600 px JPEG, and a 320 px thumbnail made from that. */
export async function makePhoto(file: Blob): Promise<{ blob: Blob; thumb: Blob }> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const big = fitSize(bmp.width, bmp.height, 1600), c = drawOn(bmp, big.w, big.h); bmp.close();
  const small = fitSize(big.w, big.h, 320);
  return { blob: await jpeg(c), thumb: await jpeg(drawOn(c, small.w, small.h)) };
}
/* One size only (kept for callers that need a single size). */
export async function resizeImage(file: Blob, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }), { w, h } = fitSize(bmp.width, bmp.height, max), c = drawOn(bmp, w, h); bmp.close();
  return jpeg(c);
}
