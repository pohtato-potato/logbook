export function fitSize(w: number, h: number, max: number) { const k = Math.min(1, max / Math.max(w, h)); return { w: Math.round(w * k), h: Math.round(h * k) }; }
/* Resize in the browser: respects the photo's own orientation, and always writes a JPEG. */
export async function resizeImage(file: Blob, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { w, h } = fitSize(bmp.width, bmp.height, max);
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(w, h); c.getContext('2d')!.drawImage(bmp, 0, 0, w, h); bmp.close();
    return c.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d')!.drawImage(bmp, 0, 0, w, h); bmp.close();
  return new Promise((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('encode'))), 'image/jpeg', 0.85));
}
