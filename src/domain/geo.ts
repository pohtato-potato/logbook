/* Positions are kept to about 100 m: enough for a map of your places, no more. */
export const roundCoord = (x: number) => Math.round(x * 1000) / 1000;
type LL = { lat: number; lon: number };
/* A simple, honest projection for a small area: longitude scaled by the cosine of the middle latitude, north up.
   A single place (or places within ~2 km) gets a minimum box, so the map never zooms to infinity. */
export function projection(points: LL[], w: number, h: number, pad: number) {
  if (!points.length) return null;
  let s = Math.min(...points.map(p => p.lat)), n = Math.max(...points.map(p => p.lat)), west = Math.min(...points.map(p => p.lon)), east = Math.max(...points.map(p => p.lon));
  const k = Math.cos(((s + n) / 2) * Math.PI / 180), minSpan = 0.01;
  if (n - s < minSpan * 2) { const c = (s + n) / 2; s = c - minSpan; n = c + minSpan; }
  if ((east - west) * k < minSpan * 2) { const c = (west + east) / 2; west = c - minSpan / k; east = c + minSpan / k; }
  const spanX = (east - west) * k, spanY = n - s, scale = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
  const offX = (w - spanX * scale) / 2, offY = (h - spanY * scale) / 2;
  return (p: LL) => ({ x: offX + (p.lon - west) * k * scale, y: offY + (n - p.lat) * scale });
}
