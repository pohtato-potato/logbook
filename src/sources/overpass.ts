import { haversineKm } from '../domain/stamps';

const r3 = (x: number) => Math.round(x * 1000) / 1000;
/* Named places within 300 m, asked only when the owner taps "Suggest names nearby". The position is sent to about 100 m. */
export function overpassQuery(lat: number, lon: number): { url: string; init: RequestInit } {
  const ql = `[out:json][timeout:10];nwr(around:300,${r3(lat)},${r3(lon)})[name][~"^(amenity|shop|leisure|tourism|historic|railway|public_transport)$"~"."];out center 30;`;
  return { url: 'https://overpass-api.de/api/interpreter', init: { method: 'POST', body: new URLSearchParams({ data: ql }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } } };
}
type El = { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: { name?: string } };
export function parsePlaces(j: unknown, lat: number, lon: number): { name: string; km: number }[] {
  const els = j && typeof j === 'object' ? (j as { elements?: unknown }).elements : undefined; if (!Array.isArray(els)) return [];
  const seen = new Map<string, number>();
  for (const e of els as El[]) {
    const name = e?.tags?.name?.trim(), p = e?.center ?? (typeof e?.lat === 'number' && typeof e?.lon === 'number' ? { lat: e.lat, lon: e.lon } : null);
    if (!name || !p) continue;
    const km = haversineKm(lat, lon, p.lat, p.lon); if (!seen.has(name) || km < seen.get(name)!) seen.set(name, km);
  }
  return [...seen].sort((a, b) => a[1] - b[1]).slice(0, 5).map(([name, km]) => ({ name, km: Math.max(0.1, Math.round(km * 10) / 10) }));
}
