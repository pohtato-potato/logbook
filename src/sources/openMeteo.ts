import { addDays } from '../domain/day';
import type { Hourly } from '../domain/aqi';

const r2 = (x: number) => String(Math.round(x * 100) / 100);
const q = (base: string, p: Record<string, string>) => `${base}?${new URLSearchParams(p)}`;
/* Weather for one day, near a rounded position (about 1 km). The archive reaches back to 1940. */
export function weatherUrl(day: string, lat: number, lon: number, today: string): string | null {
  if (day < '1940-01-01' || day > addDays(today, 14)) return null;
  const base = day < addDays(today, -60) ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
  return q(base, { latitude: r2(lat), longitude: r2(lon), daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum', timezone: 'auto', start_date: day, end_date: day });
}
/* Air for one day: Open-Meteo has it from August 2022, and keeps about three months at hand. */
export function airUrl(day: string, lat: number, lon: number, today: string): string | null {
  if (day < '2022-08-01' || day > today || day < addDays(today, -92)) return null;
  return q('https://air-quality-api.open-meteo.com/v1/air-quality', { latitude: r2(lat), longitude: r2(lon), hourly: 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone', timezone: 'auto', start_date: day, end_date: day });
}
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
export function parseWeather(j: unknown): { code: number; max: number; min: number; rain: number } | null {
  const d = (j && typeof j === 'object' ? (j as { daily?: Record<string, unknown[]> }).daily : undefined); if (!d || typeof d !== 'object') return null;
  const first = (k: string) => (Array.isArray(d[k]) ? d[k][0] : undefined);
  const code = num(first('weather_code')), max = num(first('temperature_2m_max')), min = num(first('temperature_2m_min')), rain = num(first('precipitation_sum')) ?? 0;
  return code == null || max == null || min == null ? null : { code, max, min, rain };
}
export function parseAir(j: unknown): Hourly | null {
  const h = (j && typeof j === 'object' ? (j as { hourly?: Record<string, unknown> }).hourly : undefined); if (!h || typeof h !== 'object') return null;
  const a = (k: string) => (Array.isArray(h[k]) ? (h[k] as unknown[]).map(x => (typeof x === 'number' ? x : NaN)) : []);
  const out = { pm10: a('pm10'), pm2_5: a('pm2_5'), co: a('carbon_monoxide'), no2: a('nitrogen_dioxide'), so2: a('sulphur_dioxide'), o3: a('ozone') };
  return Object.values(out).some(v => v.length) ? out : null;
}
