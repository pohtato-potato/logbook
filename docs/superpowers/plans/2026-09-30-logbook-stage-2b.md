# Logbook Stage 2b (Stamps) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each day quietly gathers its automatic stamps:
- the weather outside and rain;
- air quality on the Indian scale;
- sunrise, sunset, day length and the moon;
- distance from home, days at this home, and the next trip;
- birthdays and span days;
- OpenStreetMap place-name suggestions on the place form, only when the owner asks.

Stamps never block writing, wait patiently when offline, and every outside source can be switched off. The Stage 2a leftovers are closed first.

**Architecture:**
- Pure calculation in `src/domain`:
  - `sun.ts`: sunrise, sunset, day length and moon, computed on the phone;
  - `aqi.ts`: the Indian AQI from CPCB breakpoints, and weather-code words;
  - `stamps.ts`: which position a day uses, which home, and the list of stamps in words.
- Outside sources live in `src/sources`, one module each. Each has pure URL builders and response parsers, tested against saved sample responses; a small `http.ts` does the fetching with a timeout.
- `src/db/stamps.ts` decides what to fetch and caches it in `days.stamps`. It never throws: it reports `ok`, `off`, `no-place` or `offline`.
- Screens read the cache with `useLiveQuery` and trigger one refresh when a day is opened, and again when the phone comes back online.

**Tech Stack:** unchanged (Vite 8, React 19, TypeScript 7, Dexie 4, Vitest 5 + fake-indexeddb). No new dependencies. Tests never touch the network: every source takes an injected `fetchJson`.

**Spec:** `docs/superpowers/specs/2026-09-30-logbook-design.md`, sections 9 (Automatic stamps), 13 (States and errors) and 3 ("Nothing is loaded from outside the app… the only network calls are to the named data sources, and each can be switched off"). The approved look is the "Today’s stamps" panel in `design/pinboard8-source/p7-screens.js:81`: `.stamps`, `.stamp`, 4 shown, then "Show all N". The sample stamp data is `STAMPS` in `p7-data2.js:53`.

## Global Constraints

- Everything in Stage 1's and 2a's Global Constraints still holds. That includes: no personal data in the repo, colour never alone, 44 px targets, 13 px minimum text, Undo at most once, nothing half-saves, and no pushes without the owner asking.
- **The only hosts Logbook may contact:** `api.open-meteo.com`, `archive-api.open-meteo.com`, `air-quality-api.open-meteo.com` and `overpass-api.de`. A test enforces this across `src/`.
- **Positions sent out are coarse:**
  - Weather and air get 2 decimal places (about 1 km).
  - OpenStreetMap gets 3 decimal places (about 100 m), and only when the owner taps "Suggest names nearby".
  - No names, dates of birth, people or text ever leave the phone.
- Location is read only when the owner taps a button ("Add where I am today", "Use where I am"), never in the background. It is rounded to 3 decimal places before storing.
- **Two switches in Settings:**
  - "Weather and air" (Open-Meteo), on by default;
  - "Place names" (OpenStreetMap), on by default, and it still only runs on a tap.
  - Switching one off stops all requests to that source at once. The stamps panel then says "Weather is switched off in Settings."
- Stamps never block writing. A failed or offline fetch leaves "Waiting for a connection. Nothing is lost." and retries on the next open or on the browser's `online` event.
- Stamps are shown in words, with no colour carrying meaning. The AQI category is spoken ("212, poor (India scale)").
- Commit after each task on the local branch `stage-2b`, made from `main`, with author `pohtato-potato` (the repo-local identity is already set). Never push.

## Review Focus

1. **A day with no known place:** no stamp from the day, no homes in the starter file, no positioned place entry. Weather is not requested, and the panel says "Add where you are, or load your homes in Settings, for weather here." Sun and moon still need a position, so they are hidden too. The tests are in Task 5 and Task 6.
2. **Offline, a timeout, or a garbled response** (HTML error page, missing fields, `NaN`s). Nothing is cached as if it were real, the status is `offline`, and no `undefined`, `NaN` or `null°` ever reaches the screen. The tests are in Task 4 and Task 5.
3. **Days far in the past:**
   - a "something from before" entry in 1962 uses the archive endpoint and gets weather;
   - before 1940 there is no request and no stamp;
   - air before August 2022 is not requested;
   - a date in the future beyond the forecast range gets no request.

   The tests are in Task 4 and Task 5.
4. **Polar and edge sun cases:** midnight sun and polar night give "The sun doesn't set today" and "The sun doesn't rise today", not `NaN:NaN`. The day-length comparison across a DST change stays correct. The tests are in Task 2.
5. **Switching a source off while a request is in flight:** the result is dropped, not cached, and no further requests are made. The test is in Task 5.

---

## File map

```
src/domain/sun.ts          sunTimes(day, lat, lon), moonOf(atMs), dayLengthWords
src/domain/aqi.ts          indianAqi(hourly), AQI_CATEGORIES, weatherWords(code)
src/domain/stamps.ts       dayPosition, homeOn, homeForDistance, haversineKm, stampList(...)
src/sources/http.ts        fetchJson(url, init?, ms)  (the only file that calls fetch)
src/sources/openMeteo.ts   weatherUrl, airUrl, parseWeather, parseAir
src/sources/overpass.ts    overpassQuery, parsePlaces
src/db/stamps.ts           ensureStamps(db, day, now, fetchJson) and addWhereToday
src/db/types.ts            DayStamps; DayRow.stamps; Settings.sources
src/ui/useStamps.ts        runs ensureStamps on open and on 'online'
src/screens/Stamps.tsx     StampsPanel(View), OutsideLine
src/screens/Today.tsx, DayPage.tsx, Settings.tsx, forms/index.tsx, forms/FormScreen.tsx   wiring
src/domain/markdown.ts     stamps in the front matter
tests/fixtures/openmeteo-*.json, overpass-sample.json   small saved sample responses (made-up coordinates)
```

---

### Task 1: Stage 2a leftovers

**Files:**
- Modify: `src/screens/KeptCard.tsx`, `src/domain/markdown.ts`, `src/db/exportMarkdown.ts`, `src/screens/forms/index.tsx`, `src/domain/day.ts`, `src/screens/DayPage.tsx`, `src/domain/image.ts`, `scripts/port-css-2a.py`
- Test: `tests/leftovers-2b.test.tsx`

**Interfaces:**
- Produces:
  - `validPastDate` refuses years before 1900: "Choose a year from 1900 on."
  - `parseDay` uses `setFullYear`, so years below 100 never shift.
  - `KeptCard` for `past` shows "Written later, on {local date}" in place of the time.
  - Markdown for `past` has no time heading: `## Written later`.
  - The keepsake line links its photo, and `places.md` lists every place with its visits, whether it's a first, and its rounded position.
  - The day page gets the ⋯ menu (Remove, with Undo).
  - `resizeImage` decodes once, fills white first, and makes the thumbnail from the 1600 px result.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { validPastDate } from '../src/screens/forms';
import { parseDay } from '../src/domain/day';
import { KeptCard } from '../src/screens/KeptCard';
import { dayToMarkdown } from '../src/domain/markdown';
import { placesMarkdown } from '../src/db/exportMarkdown';

const lk = { places: new Map(), spans: new Map(), people: new Map() };
const past = { id: 9, day: '1995-03-02', at: Date.UTC(2026, 8, 29, 18, 45), tz: 'Asia/Kolkata', kind: 'past' as const, text: 'Graduation', marks: {}, tags: [], people: [], writtenAt: Date.UTC(2026, 8, 29, 18, 45), data: { kind: 'past' as const } };
describe('2a leftovers', () => {
  it('refuses years before 1900 and never shifts small years', () => {
    expect(validPastDate('0050-01-01', '2026-09-29')).toBe('Choose a year from 1900 on.');
    expect(parseDay('0050-01-01').getFullYear()).toBe(50);
  });
  it('something from before shows when it was written, in local time, not a clock time', () => {
    const html = renderToStaticMarkup(<KeptCard entry={past} lookup={lk} own={{}} onOpenFeeling={() => {}} />);
    expect(html).toContain('Written later, on 30 September 2026'); expect(html).not.toContain('12:15 am');
  });
  it('the export gives it no time heading', () => {
    const md = dayToMarkdown('1995-03-02', undefined, [past], []);
    expect(md).toContain('## Written later'); expect(md).not.toMatch(/## \d/);
  });
  it('places.md lists every place with its position when it has one', () => {
    const md = placesMarkdown([{ id: 1, name: 'Café', first: true, visits: 3, lat: 10.001, lon: 20.001 }, { id: 2, name: 'Stall', first: false, visits: 1 }]);
    expect(md).toContain('- Café: 3 visits, a first, at 10.001, 20.001'); expect(md).toContain('- Stall: 1 visit, no position');
  });
});
```

Also add to `tests/export2.test.ts`: a keepsake with a photo exports its line as `Keepsake: Ticket. ![Keepsake](../../photos/2026/09/2026-09-29-1.jpg)`.

Run: `npx vitest run tests/leftovers-2b.test.tsx tests/export2.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement**

1. **`day.ts`, `parseDay`:** `const d = new Date(2000, 0, 1, 12); d.setFullYear(y, m - 1, dd); return d;`
2. **`forms/index.tsx`, `validPastDate`:** after the format check, `if (Number(d.slice(0, 4)) < 1900) return 'Choose a year from 1900 on.';`
3. **`KeptCard.tsx`:**
   - The date is `longDate(dayKey(new Date(e.writtenAt)))`, using local time via `dayKey`.
   - For `kind === 'past'`, the meta row shows `Written later` instead of `timeLabelIn(...)`, and the body's hint line is dropped.
4. **`markdown.ts`:**
   - For `past`, the heading is `## Written later`, then the text, then `Written on {local date}`.
   - `DayFiles` gains `keepPhotos: Map<number, string>` (entryId to path). A keep line appends ` ![Keepsake](../../{path})`.
5. **`exportMarkdown.ts`:**
   - Fill `keepPhotos` from keep entries whose `photoId` has an exported path.
   - Add `export function placesMarkdown(places: Place[]): string`, starting `# Places` and one line per place, sorted by visits: `- {name}: {n} visit(s)[, a first][, at {lat}, {lon} | , no position]`.
   - Put it in the zip as `places.md`.
6. **`DayPage.tsx`:** pass `onMenu`. It opens the same entry sheet as Today ("Remove it" through `removeEntry`, with Undo). Move that sheet into `src/screens/EntryMenu.tsx` and use it from both screens.
7. **`image.ts`:**
   - Decode once with `createImageBitmap`.
   - Draw onto a white-filled canvas at `fitSize(…, 1600)`.
   - Encode it, then make the 320 px thumbnail from that canvas.
   - Change the signature to `resizeImage(file): Promise<{ blob: Blob; thumb: Blob }>`, and update `prepare` in `db/photos.ts` to call it once. The test fakes keep their `(b, max)` shape through a small adapter `(file) => ({ blob: await r(file, 1600), thumb: await r(file, 320) })`.
8. **`port-css-2a.py`:** remove the unused `spec` line.

- [ ] **Step 3: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A src tests scripts && git commit -m "fix: Stage 2a leftovers (written-later dates, years from 1900, places.md, keepsake photo links, remove from the day page, one-decode photos)"
```

---

### Task 2: Sun, day length and moon, on the phone

**Files:**
- Create: `src/domain/sun.ts`
- Test: `tests/sun.test.ts`

**Interfaces:**
- Produces:
  - `sunTimes(day: string, lat: number, lon: number): { rise: number; set: number } | 'up-all-day' | 'down-all-day'`, as epoch ms (NOAA sunrise equation, ±2 min).
  - `dayLengthMin(day, lat, lon): number | null`
  - `dayLengthWords(today: number, yesterday: number | null): string`, e.g. `'11 h 56 m, a minute shorter'`, `'2 minutes longer'` or `'about the same'`.
  - `moonOf(atMs: number): { age: number; lit: number; words: string }`, e.g. `'Waning, 88% lit'`, `'Full moon'`, `'New moon'`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { dayLengthMin, dayLengthWords, moonOf, sunTimes } from '../src/domain/sun';

const near = (ms: number, iso: string, min = 3) => expect(Math.abs(ms - Date.parse(iso)) / 60000).toBeLessThan(min);
describe('sun', () => {
  it('London at midsummer: rises about 3:43 and sets about 20:21 UTC', () => {
    const s = sunTimes('2026-06-21', 51.5074, -0.1278); if (typeof s === 'string') throw new Error(s);
    near(s.rise, '2026-06-21T03:43:00Z'); near(s.set, '2026-06-21T20:21:00Z');
  });
  it('midnight sun and polar night say so', () => {
    expect(sunTimes('2026-06-21', 78.22, 15.65)).toBe('up-all-day');
    expect(sunTimes('2026-12-21', 78.22, 15.65)).toBe('down-all-day');
  });
  it('day length in words', () => {
    expect(dayLengthWords(716, 717)).toBe('11 h 56 m, a minute shorter');
    expect(dayLengthWords(600, 597)).toBe('10 h 0 m, 3 minutes longer');
    expect(dayLengthWords(600, 600)).toBe('10 h 0 m, about the same');
    expect(dayLengthWords(600, null)).toBe('10 h 0 m');
    expect(dayLengthMin('2026-06-21', 78.22, 15.65)).toBeNull();
  });
});
describe('moon', () => {
  it('is full on 26 September 2026 and new on 6 January 2000', () => {
    expect(moonOf(Date.UTC(2026, 8, 26, 12)).words).toBe('Full moon');
    expect(moonOf(Date.UTC(2000, 0, 6, 18)).words).toBe('New moon');
  });
  it('a waning gibbous moon reads in words with its light', () => expect(moonOf(Date.UTC(2026, 8, 29, 12)).words).toMatch(/^Waning, \d+% lit$/));
});
```

Run: `npx vitest run tests/sun.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 2: Implement `sun.ts`**

```ts
/* Sunrise and sunset from the NOAA sunrise equation, and the moon from its mean cycle. All on the phone; nothing is fetched. */
const RAD = Math.PI / 180, J2000 = 2451545, DAY = 86400000;
const toJ = (ms: number) => ms / DAY + 2440587.5, fromJ = (j: number) => (j - 2440587.5) * DAY;
export function sunTimes(day: string, lat: number, lon: number): { rise: number; set: number } | 'up-all-day' | 'down-all-day' {
  const [y, m, d] = day.split('-').map(Number), noon = Date.UTC(y, m - 1, d, 12);
  const n = Math.round(toJ(noon) - J2000 + 0.0008), Js = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360, C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const L = (M + C + 180 + 102.9372) % 360, Jt = J2000 + Js + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
  const sd = Math.sin(L * RAD) * Math.sin(23.4397 * RAD), cd = Math.cos(Math.asin(sd));
  const cw = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sd) / (Math.cos(lat * RAD) * cd);
  if (cw < -1) return 'up-all-day'; if (cw > 1) return 'down-all-day';
  const w = Math.acos(cw) / RAD / 360;
  return { rise: fromJ(Jt - w), set: fromJ(Jt + w) };
}
export function dayLengthMin(day: string, lat: number, lon: number): number | null { const s = sunTimes(day, lat, lon); return typeof s === 'string' ? null : Math.round((s.set - s.rise) / 60000); }
export function dayLengthWords(today: number, yesterday: number | null): string {
  const base = `${Math.floor(today / 60)} h ${today % 60} m`; if (yesterday == null) return base;
  const diff = today - yesterday, n = Math.abs(diff);
  return `${base}, ${diff === 0 ? 'about the same' : `${n === 1 ? 'a minute' : `${n} minutes`} ${diff > 0 ? 'longer' : 'shorter'}`}`;
}
const SYNODIC = 29.530588853, NEW_REF = 2451550.1;
export function moonOf(atMs: number) {
  const age = (((toJ(atMs) - NEW_REF) % SYNODIC) + SYNODIC) % SYNODIC, lit = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2, pct = Math.round(lit * 100);
  const words = age < 1.5 || age > SYNODIC - 1.5 ? 'New moon' : Math.abs(age - SYNODIC / 2) < 1.2 ? 'Full moon' : `${age < SYNODIC / 2 ? 'Waxing' : 'Waning'}, ${pct}% lit`;
  return { age, lit, words };
}
```

- [ ] **Step 3: Run, then commit**

Run: `npx vitest run tests/sun.test.ts`. Expected: PASS. If the London times miss by more than 3 minutes, debug the formula; don't widen the tolerance.

```bash
git add src/domain/sun.ts tests/sun.test.ts && git commit -m "feat: sunrise, sunset, day length and moon, computed on the phone"
```

---

### Task 3: The Indian AQI and weather in words

**Files:**
- Create: `src/domain/aqi.ts`
- Test: `tests/aqi.test.ts`

**Interfaces:**
- Produces:
  - `type Hourly = { pm10: number[]; pm2_5: number[]; no2: number[]; so2: number[]; co: number[]; o3: number[] }`, in µg/m³ as Open-Meteo gives them (CO too).
  - `indianAqi(h: Hourly): { aqi: number; category: string; lead: string } | null`. PM10, PM2.5, NO₂ and SO₂ use the 24-hour mean; O₃ and CO use the maximum 8-hour running mean (CO converted to mg/m³). The AQI is the highest sub-index. It returns null unless at least 3 pollutants, including PM10 or PM2.5, have 16 or more valid hours.
  - `AQI_CATEGORIES`: `Good` 0–50, `Satisfactory` 51–100, `Moderately polluted` 101–200, `Poor` 201–300, `Very poor` 301–400, `Severe` 401–500.
  - `airWords(a)`: `'212, poor (India scale)'`.
  - `weatherWords(code: number): string`, from the WMO codes: 0 Clear, 1 Mostly clear, 2 Partly cloudy, 3 Overcast, 45/48 Fog, 51–57 Drizzle, 61–67 Rain, 71–77 Snow, 80–82 Showers, 85–86 Snow showers, 95–99 Thunderstorm, anything else "Weather".

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { airWords, indianAqi, weatherWords } from '../src/domain/aqi';

const flat = (v: number) => Array(24).fill(v);
describe('Indian AQI (CPCB)', () => {
  it('PM2.5 of 100 is poor at 233 and leads', () => {
    const a = indianAqi({ pm10: flat(80), pm2_5: flat(100), no2: flat(30), so2: flat(10), co: flat(800), o3: flat(40) })!;
    expect(a).toEqual({ aqi: 233, category: 'Poor', lead: 'PM2.5' });
    expect(airWords(a)).toBe('233, poor (India scale)');
  });
  it('clean air is good', () => expect(indianAqi({ pm10: flat(20), pm2_5: flat(10), no2: flat(10), so2: flat(5), co: flat(300), o3: flat(20) })?.category).toBe('Good'));
  it('too few valid hours or no particulate data gives nothing, never NaN', () => {
    expect(indianAqi({ pm10: [], pm2_5: [], no2: flat(10), so2: flat(5), co: flat(300), o3: flat(20) })).toBeNull();
    expect(indianAqi({ pm10: Array(24).fill(NaN), pm2_5: [1, 2], no2: flat(10), so2: flat(5), co: flat(300), o3: flat(20) })).toBeNull();
  });
  it('severe stays within 500', () => expect(indianAqi({ pm10: flat(900), pm2_5: flat(600), no2: flat(10), so2: flat(5), co: flat(300), o3: flat(20) })?.aqi).toBe(500));
});
describe('weather words', () => {
  it.each([[0, 'Clear'], [2, 'Partly cloudy'], [45, 'Fog'], [63, 'Rain'], [95, 'Thunderstorm'], [7, 'Weather']])('%i', (c, w) => expect(weatherWords(c)).toBe(w));
});
```

Where 233 comes from: the PM2.5 band 91–120 maps to AQI 201–300, so 201 + (100 − 91) × 99 / 29 = 231.7. **Check this value first:** it rounds to 232, and CPCB rounds the sub-index to the nearest whole number. Work the formula below by hand before trusting the test's 233, and correct the test to the formula's value (232) if they disagree. Record that as a ruling.

Run: `npx vitest run tests/aqi.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement `aqi.ts`**

```ts
/* The Indian National AQI (CPCB): each pollutant's concentration maps linearly within its band to an index band; the AQI is the worst one. */
const BANDS: [number, number][] = [[0, 50], [51, 100], [101, 200], [201, 300], [301, 400], [401, 500]];
const BP: Record<string, number[]> = { // upper limits per band; the last band is open-ended
  'PM10': [50, 100, 250, 350, 430, 1000], 'PM2.5': [30, 60, 90, 120, 250, 500], 'NO₂': [40, 80, 180, 280, 400, 1000],
  'SO₂': [40, 80, 380, 800, 1600, 3200], 'CO': [1, 2, 10, 17, 34, 68], 'O₃': [50, 100, 168, 208, 748, 1500] };
export const AQI_CATEGORIES = ['Good', 'Satisfactory', 'Moderately polluted', 'Poor', 'Very poor', 'Severe'];
function subIndex(name: string, c: number): number {
  const up = BP[name]; let lo = 0;
  for (let i = 0; i < up.length; i++) { if (c <= up[i] || i === up.length - 1) { const [il, ih] = BANDS[i], cl = i ? lo : 0; return Math.min(500, Math.round(il + ((Math.min(c, up[i]) - cl) * (ih - il)) / (up[i] - cl))); } lo = up[i] + (name === 'CO' ? 0.1 : 1); }
  return 500;
}
const valid = (xs: number[]) => xs.filter(x => typeof x === 'number' && Number.isFinite(x));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const max8 = (xs: number[]) => { let best = -Infinity; for (let i = 0; i + 8 <= xs.length; i++) { const w = valid(xs.slice(i, i + 8)); if (w.length >= 6) best = Math.max(best, mean(w)); } return Number.isFinite(best) ? best : NaN; };
export type Hourly = { pm10: number[]; pm2_5: number[]; no2: number[]; so2: number[]; co: number[]; o3: number[] };
export function indianAqi(h: Hourly): { aqi: number; category: string; lead: string } | null {
  const conc: [string, number][] = [];
  const day = (name: string, xs: number[], scale = 1) => { const v = valid(xs); if (v.length >= 16) conc.push([name, mean(v) * scale]); };
  const eight = (name: string, xs: number[], scale = 1) => { if (valid(xs).length >= 16) { const m = max8(xs); if (Number.isFinite(m)) conc.push([name, m * scale]); } };
  day('PM10', h.pm10); day('PM2.5', h.pm2_5); day('NO₂', h.no2); day('SO₂', h.so2); eight('CO', h.co, 1 / 1000); eight('O₃', h.o3);
  if (conc.length < 3 || !conc.some(([n]) => n.startsWith('PM'))) return null;
  const subs = conc.map(([n, c]) => [n, subIndex(n, c)] as const).sort((a, b) => b[1] - a[1]), aqi = subs[0][1];
  return { aqi, category: AQI_CATEGORIES[BANDS.findIndex(([, hi]) => aqi <= hi)], lead: subs[0][0] };
}
export const airWords = (a: { aqi: number; category: string }) => `${a.aqi}, ${a.category.toLowerCase()} (India scale)`;
export function weatherWords(code: number): string {
  if (code === 0) return 'Clear'; if (code === 1) return 'Mostly clear'; if (code === 2) return 'Partly cloudy'; if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog'; if (code >= 51 && code <= 57) return 'Drizzle'; if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow'; if (code >= 80 && code <= 82) return 'Showers'; if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm'; return 'Weather';
}
```

- [ ] **Step 3: Run, then commit**

Run: `npx vitest run tests/aqi.test.ts`. Expected: PASS, after the Step 1 check of the 232 or 233 value.

```bash
git add src/domain/aqi.ts tests/aqi.test.ts && git commit -m "feat: the Indian AQI from CPCB breakpoints, and weather in words"
```

---

### Task 4: The outside sources (Open-Meteo and OpenStreetMap)

**Files:**
- Create: `src/sources/http.ts`, `src/sources/openMeteo.ts`, `src/sources/overpass.ts`, `tests/fixtures/openmeteo-weather.json`, `tests/fixtures/openmeteo-air.json`, `tests/fixtures/overpass-sample.json`
- Test: `tests/sources.test.ts`, `tests/hosts.test.ts`

**Interfaces:**
- Produces:
  - `type FetchJson = (url: string, init?: RequestInit) => Promise<unknown>`
  - `fetchJson: FetchJson`, with a 12-second `AbortController` timeout. It throws `OfflineError` on network failure, a timeout, a non-2xx status or a non-JSON body. It is the only `fetch` in `src/`.
  - `weatherUrl(day, lat, lon, today): string | null`:
    - `null` before 1940-01-01 or more than 14 days ahead;
    - the archive host when the day is more than 60 days before today, otherwise the forecast host;
    - coordinates to 2 decimal places;
    - `daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&start_date=day&end_date=day`.
  - `airUrl(day, lat, lon, today): string | null`: `null` before 2022-08-01, after today, or more than 92 days before today. Otherwise `hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto&start_date=day&end_date=day`.
  - `parseWeather(json): { code: number; max: number; min: number; rain: number } | null`: null if any field is missing or not finite.
  - `parseAir(json): Hourly | null`
  - `overpassQuery(lat, lon): { url: string; init: RequestInit }`: POST to `https://overpass-api.de/api/interpreter`, radius 300 m, named `amenity|shop|leisure|tourism|historic|railway|public_transport` features, `out center 30`, coordinates to 3 decimal places.
  - `parsePlaces(json, lat, lon): { name: string; km: number }[]`: unique names, nearest first, at most 5, `km` to 1 decimal.

- [ ] **Step 1: Write the fixtures and the failing tests**

The fixtures are small hand-written samples in the shape of the real responses, with made-up coordinates 10.00/20.00:
- `openmeteo-weather.json`: `{"latitude":10,"longitude":20,"daily":{"time":["2026-09-29"],"weather_code":[2],"temperature_2m_max":[31.4],"temperature_2m_min":[24.1],"precipitation_sum":[1.8]}}`
- `openmeteo-air.json`: `hourly.time` has 24 entries, and each pollutant array has 24 numbers (pm2_5 all 100, pm10 all 80, nitrogen_dioxide 30, sulphur_dioxide 10, carbon_monoxide 800, ozone 40).
- `overpass-sample.json`: `{"elements":[{"type":"node","lat":10.0012,"lon":20.0009,"tags":{"name":"Chai Point","amenity":"cafe"}},{"type":"way","center":{"lat":10.002,"lon":20.003},"tags":{"name":"Metro Station","railway":"station"}},{"type":"node","lat":10.0012,"lon":20.0009,"tags":{"name":"Chai Point"}},{"type":"node","lat":10.001,"lon":20.001,"tags":{}}]}`

```ts
import { describe, expect, it } from 'vitest';
import weather from './fixtures/openmeteo-weather.json';
import air from './fixtures/openmeteo-air.json';
import over from './fixtures/overpass-sample.json';
import { airUrl, parseAir, parseWeather, weatherUrl } from '../src/sources/openMeteo';
import { overpassQuery, parsePlaces } from '../src/sources/overpass';

const T = '2026-09-29';
describe('Open-Meteo', () => {
  it('recent days use the forecast host, older ones the archive, with rough coordinates', () => {
    const u = new URL(weatherUrl('2026-09-28', 10.00123, 20.98765, T)!);
    expect(u.host).toBe('api.open-meteo.com'); expect(u.searchParams.get('latitude')).toBe('10'); expect(u.searchParams.get('longitude')).toBe('20.99');
    expect(new URL(weatherUrl('1962-05-01', 10, 20, T)!).host).toBe('archive-api.open-meteo.com');
  });
  it('asks nothing before 1940, or far in the future', () => { expect(weatherUrl('1935-01-01', 10, 20, T)).toBeNull(); expect(weatherUrl('2026-12-01', 10, 20, T)).toBeNull(); });
  it('air only from August 2022, within about three months, never ahead', () => {
    expect(airUrl('2022-07-31', 10, 20, T)).toBeNull(); expect(airUrl('2026-10-01', 10, 20, T)).toBeNull(); expect(airUrl('2026-05-01', 10, 20, T)).toBeNull();
    expect(new URL(airUrl('2026-09-29', 10, 20, T)!).host).toBe('air-quality-api.open-meteo.com');
  });
  it('parses a day’s weather and hourly air, and refuses anything garbled', () => {
    expect(parseWeather(weather)).toEqual({ code: 2, max: 31.4, min: 24.1, rain: 1.8 });
    expect(parseAir(air)?.pm2_5.length).toBe(24);
    expect(parseWeather({ daily: { weather_code: [null], temperature_2m_max: [31] } })).toBeNull();
    expect(parseWeather('<html>error</html>')).toBeNull(); expect(parseAir({})).toBeNull();
  });
});
describe('OpenStreetMap names', () => {
  it('posts a small nearby query with 3-decimal coordinates', () => {
    const q = overpassQuery(10.00123, 20.00987); expect(q.url).toBe('https://overpass-api.de/api/interpreter');
    expect(String(q.init.body)).toContain('around:300,10.001,20.01');
  });
  it('lists unique named places, nearest first', () => expect(parsePlaces(over, 10, 20)).toEqual([{ name: 'Chai Point', km: 0.2 }, { name: 'Metro Station', km: 0.4 }]));
});
```

`tests/hosts.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED = new Set(['api.open-meteo.com', 'archive-api.open-meteo.com', 'air-quality-api.open-meteo.com', 'overpass-api.de']);
const files = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; });
describe('Logbook only talks to the named sources', () => {
  it('every https host in src is on the list, and only sources/http.ts calls fetch', () => {
    for (const f of files('src').filter(f => /\.(ts|tsx)$/.test(f))) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/https:\/\/([a-z0-9.-]+)/g)) expect(ALLOWED.has(m[1]), `${f}: ${m[1]}`).toBe(true);
      if (!f.replace(/\\/g, '/').endsWith('sources/http.ts')) expect(/\bfetch\(/.test(s), f).toBe(false);
    }
  });
});
```

Run: `npx vitest run tests/sources.test.ts tests/hosts.test.ts`. Expected: FAIL (modules missing). The hosts test may already pass; that's fine, it guards later tasks.

- [ ] **Step 2: Implement**

`src/sources/http.ts`:
```ts
export class OfflineError extends Error { constructor() { super('Waiting for a connection. Nothing is lost.'); this.name = 'OfflineError'; } }
export type FetchJson = (url: string, init?: RequestInit) => Promise<unknown>;
/* The one place Logbook reaches outside. Any failure (offline, slow, an error page) is the same calm OfflineError. */
export const fetchJson: FetchJson = async (url, init) => {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 12_000);
  try { const r = await fetch(url, { ...init, signal: ac.signal }); if (!r.ok) throw new OfflineError(); return await r.json(); }
  catch { throw new OfflineError(); } finally { clearTimeout(t); }
};
```

`src/sources/openMeteo.ts`:
```ts
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
export function airUrl(day: string, lat: number, lon: number, today: string): string | null {
  if (day < '2022-08-01' || day > today || day < addDays(today, -92)) return null;
  return q('https://air-quality-api.open-meteo.com/v1/air-quality', { latitude: r2(lat), longitude: r2(lon), hourly: 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone', timezone: 'auto', start_date: day, end_date: day });
}
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
export function parseWeather(j: unknown): { code: number; max: number; min: number; rain: number } | null {
  const d = (j as { daily?: Record<string, unknown[]> })?.daily; if (!d) return null;
  const code = num(d.weather_code?.[0]), max = num(d.temperature_2m_max?.[0]), min = num(d.temperature_2m_min?.[0]), rain = num(d.precipitation_sum?.[0]) ?? 0;
  return code == null || max == null || min == null ? null : { code, max, min, rain };
}
export function parseAir(j: unknown): Hourly | null {
  const h = (j as { hourly?: Record<string, unknown[]> })?.hourly; if (!h) return null;
  const a = (k: string) => (Array.isArray(h[k]) ? (h[k] as unknown[]).map(x => (typeof x === 'number' ? x : NaN)) : []);
  const out = { pm10: a('pm10'), pm2_5: a('pm2_5'), co: a('carbon_monoxide'), no2: a('nitrogen_dioxide'), so2: a('sulphur_dioxide'), o3: a('ozone') };
  return Object.values(out).some(v => v.length) ? out : null;
}
```

`src/sources/overpass.ts`:
```ts
import { haversineKm } from '../domain/stamps';
/* Named places within 300 m, asked only when the owner taps "Suggest names nearby". The position is sent to about 100 m. */
export function overpassQuery(lat: number, lon: number): { url: string; init: RequestInit } {
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const ql = `[out:json][timeout:10];nwr(around:300,${r3(lat)},${r3(lon)})[name][~"^(amenity|shop|leisure|tourism|historic|railway|public_transport)$"~"."];out center 30;`;
  return { url: 'https://overpass-api.de/api/interpreter', init: { method: 'POST', body: new URLSearchParams({ data: ql }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } } };
}
export function parsePlaces(j: unknown, lat: number, lon: number): { name: string; km: number }[] {
  const els = (j as { elements?: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: { name?: string } }[] })?.elements ?? [];
  const seen = new Map<string, number>();
  for (const e of els) { const name = e.tags?.name?.trim(), p = e.center ?? (e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null); if (!name || !p) continue;
    const km = haversineKm(lat, lon, p.lat, p.lon); if (!seen.has(name) || km < seen.get(name)!) seen.set(name, km); }
  return [...seen].sort((a, b) => a[1] - b[1]).slice(0, 5).map(([name, km]) => ({ name, km: Math.max(0.1, Math.round(km * 10) / 10) }));
}
```

`haversineKm` is produced in Task 5. To keep Task 4 self-contained, create `src/domain/stamps.ts` now with only this function (Task 5 adds the rest):
```ts
export function haversineKm(a: number, b: number, c: number, d: number): number {
  const R = 6371, r = Math.PI / 180, x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
```

Add `"resolveJsonModule": true` to `tsconfig.json` if the fixture imports fail the typecheck.

- [ ] **Step 3: Run, then commit**

Run: `npx vitest run tests/sources.test.ts tests/hosts.test.ts && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests tsconfig.json && git commit -m "feat: Open-Meteo and OpenStreetMap sources, with rough positions and one guarded fetch"
```

---

### Task 5: Where a day is, and the stamp list

**Files:**
- Modify: `src/domain/stamps.ts`, `src/db/types.ts`, `src/db/actions.ts` (DEFAULT_SETTINGS)
- Create: `src/db/stamps.ts`
- Test: `tests/stamps.test.ts`

**Interfaces:**
- Produces:
  - Types:
    - `DayStamps = { where?: { lat: number; lon: number }; weather?: { code: number; max: number; min: number; rain: number; final: boolean; at: number }; air?: { aqi: number; category: string; lead: string; final: boolean; at: number }; pending?: boolean }`
    - `DayRow.stamps?: DayStamps`
    - `Settings.sources?: { weather: boolean; places: boolean }`. Read it through `sourcesOf(settings)`, which defaults to both on.
  - `homeOn(homes, day)`: the home whose `from <= day` and (`to` is missing or `day <= to`), else the latest one starting before the day, else `undefined`.
  - `dayPosition(day, stamps, placeEntries, homes)`: `{ lat, lon, source: 'here' | 'place' | 'home' } | null`. The day's own `where` wins, then the latest positioned place entry that day, then `homeOn`.
  - `homeForDistance(homes, day)`: `homes[daysSinceEpoch(day) % homes.length]`. "A different home each day until every home has had a turn" (spec section 9).
  - `stampList(input): [string, string][]`, in the approved order: Outside, Air outside, Sun, Day length, Moon, Today is, From home, At this home, Next trip. Only the stamps that have data are included, and they are always in words. The input is `{ day, today, stamps?: DayStamps, pos, homes, people, spans }`.
  - `ensureStamps(db, day, now, fetch: FetchJson): Promise<'ok' | 'off' | 'no-place' | 'offline'>`:
    - It reads the settings and returns `'off'` when weather is switched off.
    - It works out the position, fetching weather if it's missing or not final and more than 3 hours old, and air the same way.
    - `final` means the day is 2 or more days before today.
    - Before writing, it re-reads the settings and drops the result if weather was switched off mid-flight.
    - On `OfflineError` it sets `pending: true` and returns `'offline'`. On success it clears `pending`. It never throws.
  - `addWhereToday(db, day, pos): Promise<Undo>`: stores `stamps.where`, rounded to 3 decimal places.

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import weather from './fixtures/openmeteo-weather.json';
import air from './fixtures/openmeteo-air.json';
import { dayPosition, homeForDistance, homeOn, stampList } from '../src/domain/stamps';
import { openDb, type LogbookDb } from '../src/db/db';
import { ensureStamps, addWhereToday } from '../src/db/stamps';
import { saveSettings } from '../src/db/actions';
import { OfflineError, type FetchJson } from '../src/sources/http';

const homes = [{ name: 'Home 1', lat: 10.001, lon: 20.001, from: '2019-01-01', to: '2025-06-30' }, { name: 'Home 2', lat: 10.2, lon: 20.2, from: '2025-07-01' }];
let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('st-' + n++); await db.open(); });
const fake = (log: string[]): FetchJson => async url => { log.push(new URL(url).host); return url.includes('air-quality') ? air : weather; };
const now = new Date('2026-09-29T15:00:00');

describe('where a day is', () => {
  it('the day’s own position wins, then a place kept that day, then the home of that date', () => {
    expect(dayPosition('2026-09-29', { where: { lat: 1, lon: 2 } }, [], homes)?.source).toBe('here');
    expect(dayPosition('2026-09-29', undefined, [{ lat: 3, lon: 4 }], homes)).toMatchObject({ lat: 3, source: 'place' });
    expect(dayPosition('2020-05-01', undefined, [], homes)).toMatchObject({ lat: 10.001, source: 'home' });
    expect(dayPosition('2026-09-29', undefined, [], [])).toBeNull();
  });
  it('homes by date, and each home takes its turn for distance', () => {
    expect(homeOn(homes, '2026-09-29')?.name).toBe('Home 2'); expect(homeOn(homes, '2018-01-01')).toBeUndefined();
    expect(new Set([0, 1, 2, 3].map(i => homeForDistance(homes, `2026-09-2${i}`)!.name)).size).toBe(2);
  });
  it('stamps read in words and skip what is unknown', () => {
    const list = stampList({ day: '2026-09-29', today: '2026-09-29', stamps: { weather: { code: 2, max: 31.4, min: 24.1, rain: 1.8, final: false, at: 0 }, air: { aqi: 212, category: 'Poor', lead: 'PM2.5', final: false, at: 0 } },
      pos: { lat: 10.2, lon: 20.2, source: 'home' }, homes, people: [{ id: 'a', initial: 'A', name: 'Friend A', thread: 0, birthday: '09-29' }], spans: [{ id: 1, name: 'Trip', from: '2026-10-22', to: '2026-10-25', family: 'warm' }] });
    const m = Object.fromEntries(list);
    expect(m['Outside']).toBe('Partly cloudy, 31° by day, 24° at night, 2 mm rain'); expect(m['Air outside']).toBe('212, poor (India scale)');
    expect(m['Today is']).toBe('Friend A’s birthday'); expect(m['At this home']).toBe('456 days'); expect(m['Next trip']).toBe('Trip, in 23 days');
    expect(m['Sun']).toMatch(/^rise \d{1,2}:\d{2} [ap]m, set \d{1,2}:\d{2} [ap]m$/); expect(list.map(([k]) => k)).toContain('Moon');
    expect(JSON.stringify(list)).not.toMatch(/undefined|NaN|null/);
  });
  it('with no place and no data, only the moon and what the starter file gives', () => {
    expect(stampList({ day: '2026-09-29', today: '2026-09-29', pos: null, homes: [], people: [], spans: [] }).map(([k]) => k)).toEqual(['Moon']);
  });
});
describe('fetching and caching', () => {
  it('fetches weather and air once, caches them, and does not ask again within 3 hours', async () => {
    await saveSettings(db, { homes }); const log: string[] = [];
    expect(await ensureStamps(db, '2026-09-29', now, fake(log))).toBe('ok');
    expect((await db.days.get('2026-09-29'))?.stamps).toMatchObject({ weather: { code: 2, final: false }, air: { category: 'Poor' } });
    await ensureStamps(db, '2026-09-29', new Date('2026-09-29T16:00:00'), fake(log)); expect(log).toEqual(['api.open-meteo.com', 'air-quality-api.open-meteo.com']);
  });
  it('a finished day is fetched once and kept for good', async () => {
    await saveSettings(db, { homes }); const log: string[] = [];
    await ensureStamps(db, '2026-09-20', now, fake(log)); await ensureStamps(db, '2026-09-20', new Date('2026-10-05T12:00:00'), fake(log));
    expect(log.length).toBe(2); expect((await db.days.get('2026-09-20'))?.stamps?.weather?.final).toBe(true);
  });
  it('offline leaves the day pending, never throws, and keeps the owner’s own writing untouched', async () => {
    await saveSettings(db, { homes }); await db.days.put({ day: '2026-09-29', grateful: 'tea' });
    expect(await ensureStamps(db, '2026-09-29', now, async () => { throw new OfflineError(); })).toBe('offline');
    expect(await db.days.get('2026-09-29')).toMatchObject({ grateful: 'tea', stamps: { pending: true } });
  });
  it('garbled answers are not cached as weather', async () => {
    await saveSettings(db, { homes });
    expect(await ensureStamps(db, '2026-09-29', now, async () => '<html>')).toBe('offline');
    expect((await db.days.get('2026-09-29'))?.stamps?.weather).toBeUndefined();
  });
  it('switched off: no request; switched off mid-flight: the answer is dropped', async () => {
    await saveSettings(db, { homes, sources: { weather: false, places: true } }); const log: string[] = [];
    expect(await ensureStamps(db, '2026-09-29', now, fake(log))).toBe('off'); expect(log).toEqual([]);
    await saveSettings(db, { sources: { weather: true, places: true } });
    const slow: FetchJson = async url => { await saveSettings(db, { sources: { weather: false, places: true } }); return fake([])(url); };
    await ensureStamps(db, '2026-09-29', now, slow); expect((await db.days.get('2026-09-29'))?.stamps?.weather).toBeUndefined();
  });
  it('no place known: no request', async () => { const log: string[] = []; expect(await ensureStamps(db, '2026-09-29', now, fake(log))).toBe('no-place'); expect(log).toEqual([]); });
  it('before 1940 there is nothing to ask', async () => { await saveSettings(db, { homes: [{ ...homes[0], from: '1900-01-01' }] }); const log: string[] = []; expect(await ensureStamps(db, '1935-06-01', now, fake(log))).toBe('ok'); expect(log).toEqual([]); });
  it('adding where I am today is rounded and undoable', async () => {
    const u = await addWhereToday(db, '2026-09-29', { lat: 10.123456, lon: 20.987654 });
    expect((await db.days.get('2026-09-29'))?.stamps?.where).toEqual({ lat: 10.123, lon: 20.988 });
    await u.run(); expect((await db.days.get('2026-09-29'))?.stamps?.where).toBeUndefined();
  });
});
```

`At this home` is 456 days: from 2025-07-01 to 2026-09-29 is 455 days, and counting the first day makes 456. **Check this by hand** at implementation time and fix whichever of the test and the code is wrong, with a ruling.

Run: `npx vitest run tests/stamps.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement `domain/stamps.ts`** (add to the `haversineKm` from Task 4)

```ts
import type { Person, Span } from '../db/types';
import type { DayStamps } from '../db/types';
import { addDays, parseDay, timeLabelIn, timeZone } from './day';
import { dayLengthMin, dayLengthWords, moonOf, sunTimes } from './sun';
import { airWords, weatherWords } from './aqi';
import { nextBirthday } from './birthday';
import { dateRange } from './entryText';

export type Home = { name: string; lat: number; lon: number; from: string; to?: string };
export type Pos = { lat: number; lon: number; source: 'here' | 'place' | 'home' };
const DAY = 86400000, daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY);
export function homeOn(homes: Home[], day: string): Home | undefined {
  return homes.find(h => h.from <= day && (!h.to || day <= h.to)) ?? [...homes].filter(h => h.from <= day).sort((a, b) => b.from.localeCompare(a.from))[0];
}
export function dayPosition(day: string, stamps: DayStamps | undefined, placesThatDay: { lat: number; lon: number }[], homes: Home[]): Pos | null {
  if (stamps?.where) return { ...stamps.where, source: 'here' };
  const p = placesThatDay.at(-1); if (p) return { lat: p.lat, lon: p.lon, source: 'place' };
  const h = homeOn(homes, day); return h ? { lat: h.lat, lon: h.lon, source: 'home' } : null;
}
export const homeForDistance = (homes: Home[], day: string) => (homes.length ? homes[Math.floor(parseDay(day).getTime() / DAY) % homes.length] : undefined);
export function stampList(i: { day: string; today: string; stamps?: DayStamps; pos: Pos | null; homes: Home[]; people: Person[]; spans: Span[] }): [string, string][] {
  const out: [string, string][] = [], w = i.stamps?.weather, a = i.stamps?.air, tz = timeZone();
  if (w) out.push(['Outside', `${weatherWords(w.code)}, ${Math.round(w.max)}° by day, ${Math.round(w.min)}° at night${w.rain >= 0.5 ? `, ${Math.round(w.rain)} mm rain` : ''}`]);
  if (a) out.push(['Air outside', airWords(a)]);
  if (i.pos) {
    const s = sunTimes(i.day, i.pos.lat, i.pos.lon);
    out.push(['Sun', s === 'up-all-day' ? 'The sun doesn’t set today' : s === 'down-all-day' ? 'The sun doesn’t rise today' : `rise ${timeLabelIn(s.rise, tz)}, set ${timeLabelIn(s.set, tz)}`]);
    const len = dayLengthMin(i.day, i.pos.lat, i.pos.lon); if (len != null) out.push(['Day length', dayLengthWords(len, dayLengthMin(addDays(i.day, -1), i.pos.lat, i.pos.lon))]);
  }
  out.push(['Moon', moonOf(parseDay(i.day).getTime()).words]);
  const special = [...i.people.filter(p => nextBirthday(p.birthday, i.day)?.inDays === 0).map(p => `${p.name}’s birthday`), ...i.spans.filter(s => s.from <= i.day && i.day <= s.to).map(s => `Day ${daysBetween(s.from, i.day) + 1} of ${s.name}`)];
  if (special.length) out.push(['Today is', special.join(' · ')]);
  const far = homeForDistance(i.homes, i.day);
  if (far && i.pos && i.pos.source !== 'home') out.push(['From home', `${Math.round(haversineKm(i.pos.lat, i.pos.lon, far.lat, far.lon))} km from ${far.name}`]);
  const here = homeOn(i.homes, i.day); if (here) out.push(['At this home', `${daysBetween(here.from, i.day) + 1} days`]);
  const next = [...i.spans].filter(s => s.from > i.today).sort((a, b) => a.from.localeCompare(b.from))[0];
  if (next && i.day === i.today) out.push(['Next trip', `${next.name}, in ${daysBetween(i.today, next.from)} days`]);
  return out;
}
```

`nextBirthday` moves from `screens/Shelves.tsx` to `src/domain/birthday.ts`. Shelves re-exports it, so its tests stay green. "From home" is shown only when the position isn't the home itself, because 0 km from home says nothing. The home names come from the private starter file, so no names are in the code.

- [ ] **Step 3: Implement `db/stamps.ts`**

```ts
import type { LogbookDb } from './db';
import { getSettings, type Undo } from './actions';
import type { DayStamps, Settings } from './types';
import { addDays, dayKey } from '../domain/day';
import { dayPosition } from '../domain/stamps';
import { indianAqi } from '../domain/aqi';
import { airUrl, parseAir, parseWeather, weatherUrl } from '../sources/openMeteo';
import type { FetchJson } from '../sources/http';

export const sourcesOf = (s: Settings) => s.sources ?? { weather: true, places: true };
const STALE = 3 * 3600_000, r3 = (x: number) => Math.round(x * 1000) / 1000;
const once = (label: string, fn: () => Promise<unknown>): Undo => { let done = false; return { label, run: async () => { if (done) return; done = true; await fn(); } }; };
/* Fills a day's weather and air when they are missing or stale. Never blocks, never throws; what it could not get waits for next time. */
export async function ensureStamps(db: LogbookDb, day: string, now: Date, fetch: FetchJson): Promise<'ok' | 'off' | 'no-place' | 'offline'> {
  try {
    const settings = await getSettings(db); if (!sourcesOf(settings).weather) return 'off';
    const row = await db.days.get(day), st: DayStamps = row?.stamps ?? {}, today = dayKey(now), final = day <= addDays(today, -2);
    const places = (await db.entries.where('day').equals(day).toArray()).flatMap(e => (e.data?.kind === 'place' ? [e.data.placeId] : []));
    const posPlaces = (await db.places.bulkGet(places)).flatMap(p => (p?.lat != null && p.lon != null ? [{ lat: p.lat, lon: p.lon }] : []));
    const pos = dayPosition(day, st, posPlaces, settings.homes); if (!pos) return 'no-place';
    const want = (x?: { final: boolean; at: number }) => !x || (!x.final && now.getTime() - x.at > STALE);
    const next: DayStamps = {}; let failed = false;
    const wu = want(st.weather) ? weatherUrl(day, pos.lat, pos.lon, today) : null;
    if (wu) { try { const w = parseWeather(await fetch(wu)); if (w) next.weather = { ...w, final, at: now.getTime() }; else failed = true; } catch { failed = true; } }
    const au = want(st.air) ? airUrl(day, pos.lat, pos.lon, today) : null;
    if (au) { try { const h = parseAir(await fetch(au)), a = h && indianAqi(h); if (a) next.air = { ...a, final, at: now.getTime() }; else if (!h) failed = true; } catch { failed = true; } }
    if (!sourcesOf(await getSettings(db)).weather) return 'off'; // switched off while we were asking: drop the answer
    await db.transaction('rw', db.days, async () => { const cur = (await db.days.get(day)) ?? { day }; await db.days.put({ ...cur, stamps: { ...cur.stamps, ...next, pending: failed || undefined } }); });
    return failed ? 'offline' : 'ok';
  } catch { return 'offline'; }
}
export async function addWhereToday(db: LogbookDb, day: string, pos: { lat: number; lon: number }): Promise<Undo> {
  const before = await db.days.get(day), cur = before ?? { day };
  await db.days.put({ ...cur, stamps: { ...cur.stamps, where: { lat: r3(pos.lat), lon: r3(pos.lon) }, weather: undefined, air: undefined } });
  return once('Added where you are', async () => { if (before) await db.days.put(before); else await db.days.delete(day); });
}
```

Adding "where I am" clears the cached weather and air, so the next refresh fetches them for the new place. Add the types to `db/types.ts`, and add `sources: { weather: true, places: true }` to `DEFAULT_SETTINGS`.

- [ ] **Step 4: Run, typecheck, commit**

Run: `npx vitest run tests/stamps.test.ts && npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: where a day is, its stamps in words, and a cache that waits patiently when offline"
```

---

### Task 6: The stamps on Today and the day page

**Files:**
- Create: `src/screens/Stamps.tsx`, `src/ui/useStamps.ts`
- Modify: `src/screens/Today.tsx`, `src/screens/DayPage.tsx`, `src/styles/app-extra.css` (only if `.stamps` or `.stamp` are missing from the ported CSS: port them from `p7-phone.css:159-162`)
- Test: `tests/stamps-ui.test.tsx`

**Interfaces:**
- Produces:
  - `StampsPanelView({ list, status, open, onToggle, onWhere, canLocate, placeSource }: { list: [string, string][]; status: 'ok' | 'off' | 'no-place' | 'offline' | 'loading'; open: boolean; … })`: ports the "Today’s stamps" panel.
    - It shows 4 stamps, then a "Show all N" or "Show fewer" button with `aria-expanded`.
    - A status line appears under the stamps:
      - `offline`: "Waiting for a connection. Nothing is lost."
      - `off`: "Weather is switched off in Settings."
      - `no-place`: "Add where you are, or load your homes in Settings, for weather here."
    - An "Add where I am today" button appears when `canLocate` and the position isn't already `'here'`.
  - `OutsideLine({ list })`: `Outside: Partly cloudy, 31° · air 212, poor`, or nothing when there's no weather. It sits in Today's header under the date, per spec section 8.
  - `useStamps(day): { list; status; pos }`:
    - It loads the day row, settings, people, spans and that day's positioned places with `useLiveQuery`.
    - It calls `ensureStamps(db, day, new Date(), fetchJson)` once per `day` and again on the window `online` event, and stores the status.
- Placement:
  - **Today:** the stamps panel comes after inner weather in day mode (spec order: …inner weather, together, song, stamps…). At night it folds into "Today so far", whose summary adds "stamps".
  - **Day page:** a stamps panel under the story, labelled "The day’s stamps". Opening an old day is what fetches its archive weather.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OutsideLine, StampsPanelView } from '../src/screens/Stamps';

const list: [string, string][] = [['Outside', 'Partly cloudy, 31° by day, 24° at night'], ['Air outside', '212, poor (India scale)'], ['Sun', 'rise 6:08 am, set 6:04 pm'], ['Day length', '11 h 56 m'], ['Moon', 'Waning, 88% lit'], ['At this home', '412 days']];
const noop = () => {};
describe('stamps panel', () => {
  it('shows four, then offers the rest', () => {
    const html = renderToStaticMarkup(<StampsPanelView list={list} status="ok" open={false} onToggle={noop} onWhere={noop} canLocate placeSource="home" />);
    expect(html).toContain('Today’s stamps'); expect(html).toContain('Show all 6'); expect(html).toContain('aria-expanded="false"'); expect(html).not.toContain('412 days');
    expect(html).toContain('Add where I am today');
  });
  it.each([['offline', 'Waiting for a connection. Nothing is lost.'], ['off', 'Weather is switched off in Settings.'], ['no-place', 'Add where you are, or load your homes in Settings, for weather here.']] as const)('%s says so', (status, words) =>
    expect(renderToStaticMarkup(<StampsPanelView list={[['Moon', 'Full moon']]} status={status} open={false} onToggle={noop} onWhere={noop} canLocate={false} placeSource={undefined} />)).toContain(words));
  it('the header line is short, and absent without weather', () => {
    expect(renderToStaticMarkup(<OutsideLine list={list} />)).toContain('Outside: Partly cloudy, 31° · air 212, poor');
    expect(renderToStaticMarkup(<OutsideLine list={[['Moon', 'Full moon']]} />)).toBe('');
  });
});
```

Also add to `tests/today.test.tsx` (the night test): the fold's summary contains `stamps`, and `Today’s stamps` isn't shown at night.

Run: `npx vitest run tests/stamps-ui.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement `Stamps.tsx` and `useStamps.ts`**

```tsx
import { Icon } from '../ui/Icons';
export type StampStatus = 'ok' | 'off' | 'no-place' | 'offline' | 'loading';
const STATUS: Partial<Record<StampStatus, string>> = { offline: 'Waiting for a connection. Nothing is lost.', off: 'Weather is switched off in Settings.', 'no-place': 'Add where you are, or load your homes in Settings, for weather here.' };
export function StampsPanelView({ title = 'Today’s stamps', list, status, open, onToggle, onWhere, canLocate, placeSource }: { title?: string; list: [string, string][]; status: StampStatus; open: boolean; onToggle(): void; onWhere(): void; canLocate: boolean; placeSource?: 'here' | 'place' | 'home' }) {
  const shown = open ? list : list.slice(0, 4);
  return <section className="panel"><h2 className="lbl">{title}</h2>
    <div className="stamps">{shown.map(([k, v]) => <p key={k} className="stamp"><b>{k}</b>{v}</p>)}</div>
    {STATUS[status] && <p className="hint" role="status">{STATUS[status]}</p>}
    {list.length > 4 && <button type="button" className="btn ghost wide" aria-expanded={open} onClick={onToggle}>{open ? 'Show fewer' : `Show all ${list.length}`}</button>}
    {canLocate && placeSource !== 'here' && <button type="button" className="btn wide" onClick={onWhere}><Icon name="k-place" />Add where I am today</button>}
  </section>;
}
export function OutsideLine({ list }: { list: [string, string][] }) {
  const m = Object.fromEntries(list), w = m['Outside'], a = m['Air outside'];
  if (!w) return null;
  const short = w.replace(/ by day.*$/, '°').replace(/°°$/, '°'), air = a ? ` · air ${a.replace(/ \(India scale\)$/, '')}` : '';
  return <p className="tstamp">Outside: {short}{air}</p>;
}
```

This produces "Partly cloudy, 31°". **Check the regex against the test** at implementation time; if it's wrong, simplify it to `w.split(' by day')[0] + '°'` after dropping the trailing `°` from the first part.

`useStamps.ts`:
```ts
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSettings } from '../db/actions';
import { ensureStamps } from '../db/stamps';
import { fetchJson } from '../sources/http';
import { dayKey } from '../domain/day';
import { dayPosition, stampList } from '../domain/stamps';
import type { StampStatus } from '../screens/Stamps';

/* A day's stamps: shown from the cache at once, refreshed in the background when the day opens and when the phone comes back online. */
export function useStamps(day: string) {
  const [status, setStatus] = useState<StampStatus>('loading');
  useEffect(() => { let live = true; const run = () => ensureStamps(db, day, new Date(), fetchJson).then(s => { if (live) setStatus(s); });
    void run(); addEventListener('online', run); return () => { live = false; removeEventListener('online', run); }; }, [day]);
  const d = useLiveQuery(async () => {
    const [row, settings, people, spans, entries] = await Promise.all([db.days.get(day), getSettings(db), db.people.toArray(), db.spans.toArray(), db.entries.where('day').equals(day).toArray()]);
    const ids = entries.flatMap(e => (e.data?.kind === 'place' ? [e.data.placeId] : []));
    const places = (await db.places.bulkGet(ids)).flatMap(p => (p?.lat != null && p.lon != null ? [{ lat: p.lat, lon: p.lon }] : []));
    const pos = dayPosition(day, row?.stamps, places, settings.homes);
    return { pos, list: stampList({ day, today: dayKey(new Date()), stamps: row?.stamps, pos, homes: settings.homes, people, spans }) };
  }, [day]);
  return { status, list: d?.list ?? [], pos: d?.pos ?? null };
}
```

Wire it up:
- **Today:** the container calls `useStamps(day)`. `TodayView` gets `stamps?: { list; status; open; onToggle; onWhere; canLocate; placeSource }` and renders `StampsPanelView` in the day order, with `OutsideLine` in the header.
- **"Add where I am today":** `navigator.geolocation.getCurrentPosition` once, then `addWhereToday` with Undo, then a new `ensureStamps`. A refusal says "Logbook couldn’t get your position. Weather uses your home instead." through `undo.fail` with a plain message.
- **Day page:** the same panel, titled "The day’s stamps".

- [ ] **Step 3: Run the tests, typecheck, and check in the browser**

Run: `npm test && npm run typecheck`. Expected: PASS.

In the browser (dev server, 375 px), load `tests/fixtures/starter.example.json`. Its fake homes are near 10/20, in the sea, which is still a real grid cell, so Open-Meteo answers. Open Today. Expected: the stamps fill in within a few seconds, with no `undefined` or `NaN`. Turn the network off in the pane (DevTools offline), reload, and expect "Waiting for a connection". Open a 1962 "something from before" day, and expect archive weather.

- [ ] **Step 4: Commit**

```bash
git add -A src tests && git commit -m "feat: today's stamps and the day's stamps, with an Outside line in the header"
```

---

### Task 7: Place names nearby, on request

**Files:**
- Modify: `src/screens/forms/index.tsx` (PlaceFormView), `src/screens/forms/FormScreen.tsx`
- Test: `tests/forms.test.tsx` (additions)

**Interfaces:**
- `PlaceFormView` gains:
  - `suggestions: { name: string; km: number }[]`
  - `suggestState: 'idle' | 'loading' | 'none' | 'offline' | 'off'`
  - `onSuggest(): void`
- When `pos` is set and places are on, a "Suggest names nearby" button appears. Tapping it posts `overpassQuery(pos)` through `fetchJson`, and shows up to 5 chips labelled `Chai Point, 0.2 km`. Tapping a chip fills the name field (`aria-pressed` on the chosen one).
- The states say:
  - `none`: "No named places close by. Type any name you like."
  - `offline`: "Couldn’t reach OpenStreetMap. Type any name you like."
  - `off`: "Place names are switched off in Settings."
- The hint under the chips is "Names from OpenStreetMap. You can change any of them."

- [ ] **Step 1: Write the failing tests** (add to `tests/forms.test.tsx`)

```tsx
it('place: suggestions only after a position, as chips with distance', () => {
  const base = { name: '', first: false, canLocate: true, error: '', places: [], homes: [], onChange: noop, onLocate: noop, onKeep: noop, onSuggest: noop };
  expect(renderToStaticMarkup(<PlaceFormView {...base} pos={null} suggestions={[]} suggestState="idle" />)).not.toContain('Suggest names nearby');
  const html = renderToStaticMarkup(<PlaceFormView {...base} pos={{ lat: 10, lon: 20 }} suggestions={[{ name: 'Chai Point', km: 0.2 }]} suggestState="idle" />);
  expect(html).toContain('Suggest names nearby'); expect(html).toContain('Chai Point, 0.2 km'); expect(html).toContain('Names from OpenStreetMap');
  expect(renderToStaticMarkup(<PlaceFormView {...base} pos={{ lat: 10, lon: 20 }} suggestions={[]} suggestState="offline" />)).toContain('Couldn’t reach OpenStreetMap');
});
```

Run: `npx vitest run tests/forms.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

In the view: after the position hint, `{p.pos && p.suggestState !== 'off' && <button type="button" className="btn wide" disabled={p.suggestState === 'loading'} onClick={p.onSuggest}>{p.suggestState === 'loading' ? 'Asking OpenStreetMap…' : 'Suggest names nearby'}</button>}`. Then the chips (`Chips` with `names={s => `${s.name}, ${km} km`}`), the state message in `role="status"`, and the hint.

In `FormScreen`:
```ts
const [sugg, setSugg] = useState<{ name: string; km: number }[]>([]), [sState, setSState] = useState<'idle' | 'loading' | 'none' | 'offline' | 'off'>('idle');
const onSuggest = async () => {
  if (!pos) return; const s = await getSettings(db); if (!sourcesOf(s).places) { setSState('off'); return; }
  setSState('loading'); const q = overpassQuery(pos.lat, pos.lon);
  try { const list = parsePlaces(await fetchJson(q.url, q.init), pos.lat, pos.lon); setSugg(list); setSState(list.length ? 'idle' : 'none'); } catch { setSState('offline'); }
};
```

- [ ] **Step 3: Run, then commit**

Run: `npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: place names from OpenStreetMap, only when asked"
```

---

### Task 8: Settings: the outside sources and your homes

**Files:**
- Modify: `src/screens/Settings.tsx`
- Test: `tests/settings.test.tsx` (additions)

**Interfaces:**
- `SettingsView` gains `onSource(key: 'weather' | 'places', on: boolean)`, plus a section "Outside sources" with two rows:
  - "Weather and air": "From Open-Meteo. Sends the day’s rough position (about 1 km), nothing else."
  - "Place names": "From OpenStreetMap, only when you tap Suggest. Sends where you are (about 100 m)."
- Each row has a real switch: `<button role="switch" aria-checked>` showing the words On or Off, at least 44 px.
- A section "Your homes" lists each home from the starter file with "Since {Month YYYY}" and "Now" or "Until {Month YYYY}". Without homes, it says "Homes come from your private starter file."

- [ ] **Step 1: Write the failing tests**

```tsx
it('outside sources can be switched off, and say what they send', () => {
  const html = renderToStaticMarkup(<SettingsView {...base} settings={{ ...DEFAULT_SETTINGS, sources: { weather: false, places: true } }} onSource={noop} />);
  expect(html).toMatch(/role="switch" aria-checked="false"[^>]*>Off/); expect(html).toContain('about 1 km'); expect(html).toContain('Homes come from your private starter file');
});
```

Run: `npx vitest run tests/settings.test.tsx`. Expected: FAIL. Reuse the file's existing `base` props, adding `onSource`.

- [ ] **Step 2: Implement, run, commit**

The switch sits in a `Row`: `<button type="button" role="switch" aria-checked={on} className={'btn sm' + (on ? ' primary' : '')} onClick={() => p.onSource(k, !on)}>{on ? 'On' : 'Off'}</button>`. The container calls `saveSettings(db, { sources: { ...sourcesOf(s), [k]: v } })`.

Run: `npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: switch each outside source off, and see your homes"
```

---

### Task 9: Stamps in the export, and the whole-app check

**Files:**
- Modify: `src/domain/markdown.ts`, `src/db/exportMarkdown.ts`, `tests/screens-2a.test.tsx` (add the stamp views)
- Test: `tests/export2.test.ts` (addition)

**Interfaces:**
- The front matter gains `weather: "Partly cloudy, 31° by day, 24° at night, 2 mm rain"` and `air: "212, poor (India scale)"` when they're cached. `dayToMarkdown` takes an optional `stamps?: DayStamps`, passed from `days.stamps`.

- [ ] **Step 1: Write the failing test**

```ts
it('stamps travel into the front matter in words', async () => {
  await db.days.put({ day: '2026-09-29', stamps: { weather: { code: 2, max: 31.4, min: 24.1, rain: 1.8, final: true, at: 0 }, air: { aqi: 212, category: 'Poor', lead: 'PM2.5', final: true, at: 0 } } });
  await keepEntry(db, { kind: 'past', text: 'x', data: { kind: 'past' }, at: new Date('2026-09-29T12:00:00') });
  const text = new TextDecoder().decode(new Uint8Array(await (await makeMarkdownZip(db)).arrayBuffer()));
  expect(text).toContain('weather: "Partly cloudy, 31° by day, 24° at night, 2 mm rain"'); expect(text).toContain('air: "212, poor (India scale)"');
});
```

Run: `npx vitest run tests/export2.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement.** Reuse the `stampList` wording: build the two strings with `weatherWords` and `airWords`, the same as `stampList`. Factor a `weatherLine(w)` out of `stampList` and use it in both places.

- [ ] **Step 3: The whole-app check**

Add `StampsPanelView` (every status) and `OutsideLine` to `tests/screens-2a.test.tsx`'s clean-render check.

Run: `npm test && npm run typecheck && npm run build`. Expected: PASS.

Then:
1. Run the probe in `scripts/probe.md` on Today (day and night), the day page, the place form with suggestions, and Settings, at 100% and 150%. Expected: `small` and `tiny` empty, `over` false.
2. Watch the Network panel while using every screen. Expected: requests only to the four allowed hosts, and none while both sources are off.

- [ ] **Step 4: Commit and hand over**

```bash
git add -A src tests && git commit -m "feat: stamps in the export; Stage 2b complete"
```

Don't merge or push. Tell the owner Stage 2b is ready and ask how to finish the branch.
