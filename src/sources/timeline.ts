import { addDays, dayKey, parseDay } from '../domain/day';
import { haversineKm } from '../domain/stamps';
import { roundCoord } from '../domain/geo';
import type { Place } from '../db/types';

/* Reading a Google Maps Timeline export the owner picked. Nothing leaves the phone: the file is read here, shown as a preview, and only then kept.
   Three shapes exist: the on-device export from Android ({ semanticSegments }), the one from iPhone (a bare list of segments, positions as "geo:lat,lon"),
   and the older Takeout monthly files ({ timelineObjects }). Only visits count, and only from 2022 on. */
export type Visit = { day: string; at: number; lat: number; lon: number; kind: 'home' | 'work' | 'other'; name?: string; placeId?: string };
const FROM = '2022-01-01', NEAR_KM = 0.1;
type O = Record<string, unknown>;
const obj = (v: unknown): O | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as O) : null);
const okPos = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
function readPos(v: unknown): { lat: number; lon: number } | null {
  if (typeof v === 'string') { const m = v.match(/(-?\d+(?:\.\d+)?)°?\s*,\s*(-?\d+(?:\.\d+)?)/); if (!m) return null; const lat = Number(m[1]), lon = Number(m[2]); return okPos(lat, lon) ? { lat, lon } : null; }
  const o = obj(v); return o ? readPos(o.latLng) : null;
}
/* The day a visit belongs to, on the clock it happened on (the export carries the offset); before 4 am counts as the day before, as everywhere in Logbook. */
function dayOf(iso: string): { day: string; at: number } | null {
  const at = Date.parse(iso); if (!Number.isFinite(at)) return null;
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})/);
  if (m && /[+-]\d{2}:?\d{2}$/.test(iso)) return { day: Number(m[2]) < 4 ? addDays(m[1], -1) : m[1], at };
  return { day: dayKey(new Date(at)), at };
}
const kindOf = (t: unknown): Visit['kind'] => { const s = String(t ?? '').toLowerCase(); return s === 'home' || s === 'inferred_home' ? 'home' : s === 'work' || s === 'inferred_work' ? 'work' : 'other'; };
function fromSegment(s: unknown): Visit | null {
  const o = obj(s), top = obj(obj(o?.visit)?.topCandidate); if (!o || !top || typeof o.startTime !== 'string') return null;
  const pos = readPos(top.placeLocation), when = dayOf(o.startTime); if (!pos || !when) return null;
  return { ...when, ...pos, kind: kindOf(top.semanticType), ...(typeof top.placeId === 'string' ? { placeId: top.placeId } : {}) };
}
function fromTakeout(t: unknown): Visit | null {
  const pv = obj(obj(t)?.placeVisit), loc = obj(pv?.location), start = obj(pv?.duration)?.startTimestamp; if (!loc || typeof start !== 'string') return null;
  const lat = Number(loc.latitudeE7) / 1e7, lon = Number(loc.longitudeE7) / 1e7, when = dayOf(start); if (!okPos(lat, lon) || !when) return null;
  const name = typeof loc.name === 'string' && loc.name.trim() ? loc.name.trim().slice(0, 80) : undefined;
  return { ...when, lat, lon, kind: kindOf(loc.semanticType), ...(name ? { name } : {}), ...(typeof loc.placeId === 'string' ? { placeId: loc.placeId } : {}) };
}
export function parseTimeline(json: unknown): Visit[] {
  const o = obj(json);
  const raw = Array.isArray(json) ? json.map(fromSegment) : Array.isArray(o?.semanticSegments) ? (o!.semanticSegments as unknown[]).map(fromSegment) : Array.isArray(o?.timelineObjects) ? (o!.timelineObjects as unknown[]).map(fromTakeout) : [];
  return raw.filter((v): v is Visit => !!v && v.day >= FROM).sort((a, b) => a.at - b.at);
}

/* What an import would do: the places (new ones, or ones Logbook already knows within about 100 m) and one visit per place per day. */
export type PlanPlace = { key: number; name: string; lat: number; lon: number; existingId?: number };
export type ImportPlan = { places: PlanPlace[]; visits: { day: string; at: number; place: number }[]; summary: string };
const nameFor = (v: Visit) => (v.kind === 'home' ? 'Home' : v.kind === 'work' ? 'Work' : v.name ?? `A place near ${v.lat.toFixed(2)}, ${v.lon.toFixed(2)}`);
const dateWords = (day: string) => parseDay(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const count = (n: number, one: string, many: string) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
export function planImport(visits: Visit[], known: Place[]): ImportPlan {
  const places: PlanPlace[] = [], byGoogleId = new Map<string, number>(), seen = new Set<string>(), out: ImportPlan['visits'] = [];
  const near = (lat: number, lon: number) => places.find(p => haversineKm(p.lat, p.lon, lat, lon) <= NEAR_KM);
  for (const v of visits) {
    let key = v.placeId ? byGoogleId.get(v.placeId) : undefined;
    if (key == null) {
      let p = near(v.lat, v.lon);
      if (!p) {
        const k = known.find(x => x.lat != null && x.lon != null && haversineKm(x.lat, x.lon, v.lat, v.lon) <= NEAR_KM) ?? known.find(x => x.lat == null && x.name.toLowerCase() === nameFor(v).toLowerCase());
        p = { key: places.length, name: k?.name ?? nameFor(v), lat: k?.lat ?? roundCoord(v.lat), lon: k?.lon ?? roundCoord(v.lon), ...(k?.id != null ? { existingId: k.id } : {}) };
        places.push(p);
      }
      key = p.key; if (v.placeId) byGoogleId.set(v.placeId, key);
    }
    const id = `${key}|${v.day}`; if (seen.has(id)) continue; seen.add(id);
    out.push({ day: v.day, at: v.at, place: key });
  }
  const used = places.filter(p => out.some(v => v.place === p.key)), days = [...new Set(out.map(v => v.day))].sort();
  const summary = out.length ? `${count(out.length, 'visit', 'visits')} on ${count(days.length, 'day', 'days')} at ${count(used.length, 'place', 'places')}, ${dateWords(days[0])} to ${dateWords(days.at(-1)!)}.` : 'No visits from 2022 on were found in this file.';
  return { places: used, visits: out, summary };
}
