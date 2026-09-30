// Renders Logbook's app icons to PNG: npm run icons
// The mark is the day page's outlined bloom: one line swelling towards four moments, its colour following the day.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });
const INK = '#0F1317';
const lobes = [[-60, 1], [20, 0.8], [110, 0.95], [200, 0.75]];
const pts = [];
for (let i = 0; i <= 180; i++) {
  const a = -Math.PI / 2 + (i / 180) * Math.PI * 2;
  let v = 0.55;
  for (const [deg, k] of lobes) { let d = Math.abs(a - (deg * Math.PI) / 180) % (Math.PI * 2); d = Math.min(d, Math.PI * 2 - d); v += 0.42 * k * Math.exp(-(d * d) / (2 * 0.34 * 0.34)); }
  const r = 62 * Math.min(1.1, v);
  pts.push(`${(100 + Math.cos(a) * r).toFixed(1)},${(100 + Math.sin(a) * r).toFixed(1)}`);
}
const bloom = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC83D"/><stop offset=".5" stop-color="#FF8FAE"/><stop offset="1" stop-color="#9C8CFF"/></linearGradient>
  <radialGradient id="c"><stop offset="0" stop-color="#FF8FAE" stop-opacity=".55"/><stop offset="1" stop-color="#FF8FAE" stop-opacity="0"/></radialGradient></defs>
  <circle cx="100" cy="100" r="46" fill="url(#c)"/><polygon points="${pts.join(' ')}" fill="none" stroke="url(#g)" stroke-width="7" stroke-linejoin="round"/>`;
const tile = (scale, rx) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="${rx}" fill="${INK}"/>
  <g transform="translate(100 100) scale(${scale}) translate(-100 -100)">${bloom}</g></svg>`;
const png = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
writeFileSync(new URL('icon-192.png', out), png(tile(0.95, 44), 192));
writeFileSync(new URL('icon-512.png', out), png(tile(0.95, 44), 512));
writeFileSync(new URL('maskable-512.png', out), png(tile(0.72, 0), 512));
writeFileSync(new URL('apple-touch-icon.png', out), png(tile(0.72, 0), 180));
writeFileSync(new URL('../favicon.svg', out), tile(1, 44));
console.log('Icons written to public/icons');
