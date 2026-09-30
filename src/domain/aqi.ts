/* The Indian National AQI (CPCB): each pollutant's concentration maps linearly within its band to an index band; the AQI is the worst one. */
const INDEX: [number, number][] = [[0, 50], [51, 100], [101, 200], [201, 300], [301, 400], [401, 500]];
// Concentration bands per pollutant, matching INDEX. µg/m³, except CO in mg/m³. The last band is open-ended; its top only sets the slope.
const BANDS: Record<string, [number, number][]> = {
  'PM10': [[0, 50], [51, 100], [101, 250], [251, 350], [351, 430], [431, 1000]],
  'PM2.5': [[0, 30], [31, 60], [61, 90], [91, 120], [121, 250], [251, 500]],
  'NO₂': [[0, 40], [41, 80], [81, 180], [181, 280], [281, 400], [401, 1000]],
  'SO₂': [[0, 40], [41, 80], [81, 380], [381, 800], [801, 1600], [1601, 2000]],
  'CO': [[0, 1], [1.1, 2], [2.1, 10], [10.1, 17], [17.1, 34], [34.1, 50]],
  'O₃': [[0, 50], [51, 100], [101, 168], [169, 208], [209, 748], [749, 1000]],
};
export const AQI_CATEGORIES = ['Good', 'Satisfactory', 'Moderately polluted', 'Poor', 'Very poor', 'Severe'];
function subIndex(name: string, c: number): number {
  const bands = BANDS[name], found = bands.findIndex(([, hi]) => c <= hi), k = found < 0 ? bands.length - 1 : found;
  const [cl, ch] = bands[k], [il, ih] = INDEX[k], x = Math.min(Math.max(c, cl), ch);
  return Math.min(500, Math.round(il + ((x - cl) * (ih - il)) / (ch - cl)));
}
const valid = (xs: number[]) => xs.filter(x => typeof x === 'number' && Number.isFinite(x));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/* The highest 8-hour running mean (for ozone and CO), counting a window when 6 of its 8 hours are known. */
const max8 = (xs: number[]) => { let best = -Infinity; for (let i = 0; i + 8 <= xs.length; i++) { const w = valid(xs.slice(i, i + 8)); if (w.length >= 6) best = Math.max(best, mean(w)); } return best; };
export type Hourly = { pm10: number[]; pm2_5: number[]; no2: number[]; so2: number[]; co: number[]; o3: number[] };
/* Needs at least three pollutants with 16 known hours, one of them PM10 or PM2.5, as CPCB does; otherwise there is no AQI for the day. */
export function indianAqi(h: Hourly): { aqi: number; category: string; lead: string } | null {
  const conc: [string, number][] = [];
  const day = (name: string, xs: number[]) => { const v = valid(xs); if (v.length >= 16) conc.push([name, mean(v)]); };
  const eight = (name: string, xs: number[], scale = 1) => { if (valid(xs).length >= 16) { const m = max8(xs); if (Number.isFinite(m)) conc.push([name, m * scale]); } };
  day('PM10', h.pm10); day('PM2.5', h.pm2_5); day('NO₂', h.no2); day('SO₂', h.so2); eight('CO', h.co, 1 / 1000); eight('O₃', h.o3);
  if (conc.length < 3 || !conc.some(([n]) => n.startsWith('PM'))) return null;
  const subs = conc.map(([n, c]) => [n, subIndex(n, c)] as const).sort((a, b) => b[1] - a[1]), aqi = subs[0][1];
  return { aqi, category: AQI_CATEGORIES[INDEX.findIndex(([, hi]) => aqi <= hi)], lead: subs[0][0] };
}
export const airWords = (a: { aqi: number; category: string }) => `${a.aqi}, ${a.category.toLowerCase()} (India scale)`;
export function weatherWords(code: number): string {
  if (code === 0) return 'Clear'; if (code === 1) return 'Mostly clear'; if (code === 2) return 'Partly cloudy'; if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog'; if (code >= 51 && code <= 57) return 'Drizzle'; if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow'; if (code >= 80 && code <= 82) return 'Showers'; if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm'; return 'Weather';
}
