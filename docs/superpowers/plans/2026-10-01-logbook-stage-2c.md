# Logbook Stage 2c (Looking back, and the private lock) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The calendar gains its other four tabs.
- **Gallery:** each day of the month as a small bloom.
- **Year:** the year as a ring or as pixels, with tap and arrow keys and the day before and after.
- **Life:** a timeline of firsts, spans, homes and things from before.
- **Feelings:** the nine families this month, the words reached for, the feelings through the day, what often comes together, and who you were with.

Private entries go behind the phone's fingerprint or PIN (WebAuthn). The Stage 2b leftovers are closed first. That completes Stage 2 of the spec.

**Architecture:**
- The looking-back numbers are pure functions in `src/domain/looking.ts`, tested directly.
- The drawings are pure canvas functions in `src/draw/year.ts` and `src/draw/clock.ts`. Hit-testing for taps is pure and tested.
- The tabs are pure views, each fed by one `useLiveQuery` container in `Calendar.tsx`. The tab is part of the route (`#/cal/2026-09?tab=year`), so Back works.
- The lock:
  - `src/domain/lock.ts` wraps WebAuthn behind an injectable `credentials` object, so it can be tested without a phone.
  - `src/ui/Privacy.tsx` holds the locked or unlocked state for the session. It locks again when the app goes to the background, and after 5 minutes.
  - Every place that shows entry text asks `usePrivacy()`.

**Tech Stack:** unchanged. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-30-logbook-design.md`:
- section 6: "Private entries are not encrypted… they sit behind an unlock step that uses the phone's fingerprint or PIN (WebAuthn)";
- section 7, "Calendar tabs";
- section 13: "Private entries locked".

The approved look is in `design/pinboard8-source/p7-screens.js`: `pCal`, `calBody` (Days, Gallery, Year) and `emoBody` (Feelings), lines 161–219. Also `p7-screens2.js`: `lifeBody` and `yearPickSheet`, lines 183–200. The drawings are `p7-scenes.js` (`drawYearRadial`, `drawClock`) and `p4-pixels.js` (`drawYearPixels`), and the styles are in `p7-phone.css`, lines 188–266.

## Global Constraints

- Everything in the Stage 1, 2a and 2b constraints still holds: no personal data in the repo, colour never alone, 44 px targets, 13 px minimum text, Undo at most once, nothing half-saves, no network except the four named hosts, and no pushes without the owner asking.
- **Looking back describes and never judges.** No "best" or "worst" months, no scores, no streaks. The Feelings tab's hint stays: "Nothing here is better or worse."
- **Every picture has words.** Each canvas has an `aria-label` that says what it shows in numbers or words. Each tab has a sentence in plain text that states the same finding (for example, "Mostly warm and calm this month.").
- **"Don't bring back" (`marks.quiet`) entries** are left out of the Life timeline, per spec section 6. They stay in the calendar.
- **The private lock:**
  - It is honest. Settings says "This hides private entries inside Logbook. It isn't encryption: your phone's own lock protects the data."
  - When it's on and locked, private text appears nowhere in the app: not on Today, the day page, shelves, tag and person pages, search, Life, or in the Feelings tab's words.
  - Private entries still appear as a quiet placeholder ("A private entry. Unlock to read."), so counts stay honest.
  - The lock uses a platform authenticator (`authenticatorAttachment: 'platform'`, `userVerification: 'required'`). Nothing is sent anywhere, because there's no server; it asks the phone to confirm the owner.
  - Export and backup ask to unlock first while the lock is on.
  - **If the passkey is lost, there is a way back:** "Set up the lock again". It creates a new passkey, which needs the phone's own fingerprint or PIN.
- Commit after each task on a local branch `stage-2c`, made from `main`. Never push.

## Review Focus

1. **Private text leaking while locked.** Check every surface that renders `entry.text` or `entryLine`: KeptCard, the day page story, shelves (quotes, firsts, keepsakes), tag and person pages, search results, Life, the Feelings tab's "words you reached for", and the calendar sheets. The owner should see placeholders only. The tests are in Task 7.
2. **The lock on a phone that can't do WebAuthn** (older browser, not a secure context, no screen lock). The switch stays off, with "This phone’s browser can’t use your fingerprint or PIN here." It is never half-on. The test is in Task 7.
3. **Empty and sparse data:** a year with 1 kept day, a month with none, no people, no tags, no firsts. Each tab says so plainly, and nothing shows `NaN` or `Infinity` (for example `max()` of an empty list, or dividing by 0 moments). The tests are in Tasks 3–6.
4. **Year tab edges:** leap years (366 days), tapping outside the ring, arrow keys at 1 January and 31 December, and a year entirely in the future. The tests are in Task 4.
5. **Time zones and the 4 am day in "Through the day":** a 1:30 am moment belongs to the evening of the day before, and its hour is 1 (not 25) on the 24-hour clock. The test is in Task 6.

---

## File map

```
src/router.ts                cal route gains tab?: 'days' | 'gallery' | 'year' | 'life' | 'feelings'
src/domain/looking.ts        dayFamilies, yearDays, monthStats, wordCounts, hourMix, oftenWith, peopleWith, lifeItems, summaries
src/draw/year.ts             drawYearRing, drawYearPixels, ringHit, pixelHit
src/draw/clock.ts            drawClock
src/screens/Calendar.tsx     tabs frame; Days (+ month summary)
src/screens/calendar/Gallery.tsx, Year.tsx, Life.tsx, Feelings.tsx
src/domain/lock.ts           lockSupport, createLock, unlock (WebAuthn, injectable)
src/ui/Privacy.tsx           PrivacyProvider, usePrivacy, LockedEntry
src/styles/app-2c.css        ported by scripts/port-css-2c.py
tests/looking.test.ts, year.test.ts, calendar-tabs.test.tsx, lock.test.tsx, leftovers-2c.test.ts
```

---

### Task 1: Stage 2b leftovers

**Files:**
- Modify: `src/db/stamps.ts`, `src/domain/stamps.ts`, `src/domain/birthday.ts`, `src/screens/Stamps.tsx`, `src/ui/useStamps.ts`, `src/screens/Today.tsx`, `src/screens/DayPage.tsx`, `src/screens/forms/FormScreen.tsx`, `src/sources/http.ts`
- Create: `.gitattributes`
- Test: `tests/leftovers-2c.test.ts`

**Interfaces:**
- `DayStamps` gains `tried?: number`, the time of the last failed or no-data attempt. `ensureStamps` skips a retry within 15 minutes of `tried`. It records `air: { none: true, at, final }` when Open-Meteo answered but gave too little data for an AQI. It doesn't write at all when nothing changed.
- `ensureStamps` returns `'none'` when the day is outside the weather records: before 1940, or more than 14 days ahead. `StampStatus` gains `'none'`: "No weather records reach this day."
- `StampsPanelView` gains `isToday: boolean`. On other days:
  - the `no-place` line is "No place is known for this day. Homes from your starter file fill this in.";
  - "Today is" becomes "That day was";
  - the polar sun words become "The sun didn’t set" and "The sun didn’t rise".
- `homeForDistance` uses a positive modulo, so days before 1970 work.
- `homeOn(homes, day, { current: true })` returns only a home whose dates cover the day. "At this home" uses it; weather keeps the fallback.
- The geolocation failure on Today says "Weather uses your home instead." only when homes exist. Otherwise it says "Logbook couldn’t get your position."
- Overpass: after the request returns, re-check the Place names switch. If it's off, drop the result and set `'off'`. Each tap first resets the state to `'idle'`.
- `nextBirthday('02-29', day)` treats 29 February as 28 February in years that aren't leap years.
- `fetchJson` sends `referrerPolicy: 'no-referrer'`.
- `.gitattributes`: `* text=auto eol=lf`, then `git add --renormalize .` in its own commit.

- [ ] **Step 1: Write the failing tests** (`tests/leftovers-2c.test.ts`)

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import weather from './fixtures/openmeteo-weather.json';
import { openDb, type LogbookDb } from '../src/db/db';
import { ensureStamps } from '../src/db/stamps';
import { saveSettings } from '../src/db/actions';
import { homeForDistance, homeOn, stampList } from '../src/domain/stamps';
import { nextBirthday } from '../src/domain/birthday';
import { OfflineError, type FetchJson } from '../src/sources/http';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('lo2c-' + n++); await db.open(); });
const homes = [{ name: 'Home 1', lat: 10, lon: 20, from: '1950-01-01' }];
const now = new Date('2026-09-29T15:00:00');
describe('2b leftovers', () => {
  it('a failed day waits 15 minutes before asking again, and an unchanged day is not rewritten', async () => {
    await saveSettings(db, { homes }); let calls = 0; const fail: FetchJson = async () => { calls++; throw new OfflineError(); };
    await ensureStamps(db, '2026-09-29', now, fail); await ensureStamps(db, '2026-09-29', new Date(now.getTime() + 60_000), fail);
    expect(calls).toBe(2); // weather + air once
    await ensureStamps(db, '2026-09-29', new Date(now.getTime() + 16 * 60_000), fail); expect(calls).toBe(4);
  });
  it('air with too little data is remembered as none, not asked again every time', async () => {
    await saveSettings(db, { homes }); let calls = 0;
    const thin: FetchJson = async url => { calls++; return url.includes('air-quality') ? { hourly: { pm10: [1, 2] } } : weather; };
    await ensureStamps(db, '2026-09-29', now, thin); await ensureStamps(db, '2026-09-29', new Date(now.getTime() + 60_000), thin);
    expect(calls).toBe(2); expect((await db.days.get('2026-09-29'))?.stamps?.air).toMatchObject({ none: true });
  });
  it('days outside the records say so', async () => { await saveSettings(db, { homes: [{ ...homes[0], from: '1900-01-01' }] }); expect(await ensureStamps(db, '1935-06-01', now, async () => weather)).toBe('none'); });
  it('distance works before 1970, and a home left behind is not "this home"', () => {
    expect(homeForDistance([{ name: 'A', lat: 1, lon: 1, from: '1950-01-01' }, { name: 'B', lat: 2, lon: 2, from: '1950-01-01' }], '1962-05-01')).toBeDefined();
    const left = [{ name: 'A', lat: 1, lon: 1, from: '2015-01-01', to: '2020-01-01' }];
    expect(homeOn(left, '2026-01-01')?.name).toBe('A'); expect(homeOn(left, '2026-01-01', { current: true })).toBeUndefined();
    expect(Object.fromEntries(stampList({ day: '2026-01-01', today: '2026-01-01', pos: null, homes: left, people: [], spans: [] }))['At this home']).toBeUndefined();
  });
  it('past days speak in the past', () => expect(Object.fromEntries(stampList({ day: '2025-12-21', today: '2026-09-29', pos: { lat: 78.22, lon: 15.65, source: 'home' }, homes: [], people: [], spans: [] }))['Sun']).toBe('The sun didn’t rise'));
  it('a 29 February birthday falls on 28 February in other years', () => expect(nextBirthday('02-29', '2027-02-28')?.inDays).toBe(0));
});
```

Also, in `tests/stamps-ui.test.tsx`, a past day with `isToday={false}` and `status="no-place"` shows "No place is known for this day", with no "Add where I am today" button.

Run: `npx vitest run tests/leftovers-2c.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement**

This is the list in Interfaces above. `stampList` takes `today` already, so the past-tense wording comes from `i.day !== i.today`.

In `ensureStamps`:
- `if (st.tried && now.getTime() - st.tried < 15 * 60_000 && st.pending) return 'offline';`
- `failed` sets `tried: now`.
- When `h && !indianAqi(h)`, set `next.air = { none: true, final, at, ...at }`.
- Skip the transaction when `next` is empty and `pending` is unchanged.

`AirStamp` becomes `{ aqi, category, lead, … } | { none: true, … }`, and `stampList` skips `none`.

- [ ] **Step 3: Run the tests and typecheck, then commit twice**

Run: `npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "fix: Stage 2b leftovers (retry pause, no-op writes skipped, past-tense stamps, pre-1970 distance, current home only, Feb 29, no referrer)"
printf '* text=auto eol=lf\n' > .gitattributes && git add .gitattributes && git add --renormalize . && git commit -m "chore: normalise line endings to LF"
```

---

### Task 2: Calendar tabs, the route, and the Days summary

**Files:**
- Modify: `src/router.ts`, `src/screens/Calendar.tsx`, `src/main.tsx`
- Create: `scripts/port-css-2c.py`, `src/styles/app-2c.css`
- Test: `tests/calendar-tabs.test.tsx`

**Interfaces:**
- `Route` `cal` becomes `{ name: 'cal'; month?: string; tab?: CalTab }`, with `CalTab = 'days' | 'gallery' | 'year' | 'life' | 'feelings'`.
  - The hash is `#/cal/2026-09?tab=year`.
  - An unknown tab falls back to `days`, and `days` is left out of the hash.
- `CalendarView` renders the `.ctabs` tablist (Days, Gallery, Year, Life, Feelings) with `role="tab"` and `aria-selected`. Tabs switch with `go({ name: 'cal', month, tab })`.
  - The heading is "September 2026" for Days, Gallery and Feelings, "2026" for Year, and "Your life" for Life.
  - Year and Life hide the month arrows. Year has its own year arrows.
- The Days tab gains a "{Month} so far" panel: "{n} days kept, {m} moments, {f} firsts, {p} days with photos."
- `scripts/port-css-2c.py` is `port-css-2a.py` with the pattern `\.ctabs|\.gal\b|\.gc2|\.ystyle|\.ycanvas|\.yp-row|\.minical|\.sel-box|\.emo-sum|\.emogrid|\.emocell|canvas\.clock|\.often|\.of-|\.life\b|\.lifeitem`. It writes `src/styles/app-2c.css`, which is imported after `app-2a.css`. Check the result doesn't repeat `.ctabs` rules already in `app.css`: grep before adding, and keep the newer version.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash } from '../src/router';
import { CalendarView } from '../src/screens/Calendar';

describe('calendar tabs', () => {
  it('the tab is part of the route', () => {
    expect(parseRoute(routeHash({ name: 'cal', month: '2026-09', tab: 'year' }))).toEqual({ name: 'cal', month: '2026-09', tab: 'year' });
    expect(parseRoute('#/cal/2026-09?tab=rocket')).toEqual({ name: 'cal', month: '2026-09' });
    expect(routeHash({ name: 'cal', month: '2026-09', tab: 'days' })).toBe('#/cal/2026-09');
  });
  it('five tabs, one selected, and the month so far in words', () => {
    const html = renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" tab="days" days={{ '2026-09-12': { family: 'calm', count: 3, first: true, photo: true } }} spans={[]} open={null} onOpen={() => {}} onMonth={() => {}} />);
    for (const t of ['Days', 'Gallery', 'Year', 'Life', 'Feelings']) expect(html).toContain(`>${t}</button>`);
    expect(html).toMatch(/aria-selected="true"[^>]*>Days/); expect(html).toContain('1 day kept, 3 moments, 1 first, 1 day with photos.');
  });
});
```

Run: `npx vitest run tests/calendar-tabs.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

`DayInfo` gains `photo?: boolean`, filled from `days.potd` in `buildMonthDays` (pass `rows`, which already hold `potd`). `CalendarView` gets `tab: CalTab` and an optional `children` for the other tabs' bodies, rendered in place of the Days grid. The `Calendar` container passes the tab through and renders `<Gallery/>`, `<Year/>`, `<Life/>` or `<Feelings/>`; until each task lands, render `<p className="entry">Coming in this stage.</p>`.

- [ ] **Step 3: Run the tests, port the CSS, commit**

Run: `python scripts/port-css-2c.py && npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests scripts && git commit -m "feat: the calendar's five tabs, in the route, and each month in words"
```

---

### Task 3: Looking back (pure numbers)

**Files:**
- Create: `src/domain/looking.ts`
- Test: `tests/looking.test.ts`

**Interfaces:**
- `dayFamilies(moments, rows): Map<string, { family: Family; count: number }>`: each day's family, taken from the set day overall, else `suggestedOverall`, plus its moment count. Move `suggestedOverall` from `screens/Today.tsx` to `domain/looking.ts` and re-export it from Today.
- `yearDays(year, fams): ({ day: string; family?: Family; v: number })[]`: every day of the year, 365 or 366 entries, with `v = min(1, count / 5)`.
- `monthStats(month, moments): { counts: Record<Family, number>; total: number; top: Family[] }`: `top` is the two most-felt families, ties broken by the order of `FAMILIES`.
- `monthSummary(stats): string`:
  - `'Mostly warm and calm this month.'`
  - `'Mostly warm this month.'` when the second family is under half the first
  - `'Nothing felt yet this month.'`
- `wordCounts(moments): [string, { family: Family; n: number }][]`: every moment's word plus the words in its `about`, most frequent first, top 10.
- `hourMix(moments): { hour: number; parts: [Family, number][] }[]`: 24 hours, each hour's families as fractions summing to 1 (empty when none). The hour is the local clock hour of `at` (0–23), not the 4 am shifted one.
- `hourSummary(mix): string`:
  - `'Tense in the mornings, warm in the evenings, wistful late at night.'`: for the four quarters (6–12 morning, 12–17 afternoon, 17–22 evening, 22–6 late at night), name each quarter's top family where it has at least 3 moments;
  - `'Too few moments yet to see a pattern through the day.'` otherwise.
- `oftenWith(entries, fams): { tag: string; families: Family[] }[]`: for each tag, the two families most often on the days it appears. Only tags on at least 2 days, top 5 tags.
- `peopleWith(entries, fams, people): { person: Person; families: Family[] }[]`: the same, for people.
- `lifeItems(entries, spans, homes, lookup): { year: number; day: string; text: string; later: boolean; span?: Span; family?: Family }[]`:
  - from `past` entries (later: true), entries marked First, spans, and home starts ("Moved to {home name}");
  - newest first;
  - leaves out `marks.quiet`;
  - replaces `marks.priv` text with the placeholder (the caller passes `locked`).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { dayFamilies, hourMix, hourSummary, lifeItems, monthStats, monthSummary, oftenWith, wordCounts, yearDays } from '../src/domain/looking';

const m = (day: string, hhmm: string, word: string, family: string, about?: string) => ({ id: Math.random(), day, at: new Date(`${day}T${hhmm}:00`).getTime(), word, family, strength: 3, ...(about ? { about } : {}) }) as never;
const e = (day: string, x: object) => ({ id: Math.random(), day, at: 0, tz: 'UTC', kind: 'line', text: 't', marks: {}, tags: [], people: [], writtenAt: 0, ...x }) as never;
const lk = { places: new Map(), spans: new Map(), people: new Map() };
describe('looking back', () => {
  it('each day has a family: the set overall wins over the suggestion', () => {
    const f = dayFamilies([m('2026-09-01', '09:00', 'calm', 'calm'), m('2026-09-01', '10:00', 'calm', 'calm')], [{ day: '2026-09-01', overall: { word: 'warm', family: 'warm', strength: 3, set: true } }]);
    expect(f.get('2026-09-01')).toEqual({ family: 'warm', count: 2 });
  });
  it('a year has every day, leap years too', () => { expect(yearDays(2028, new Map()).length).toBe(366); expect(yearDays(2026, new Map()).length).toBe(365); });
  it('the month in words, and nothing when empty', () => {
    expect(monthSummary(monthStats('2026-09', [m('2026-09-01', '09:00', 'a', 'warm'), m('2026-09-02', '09:00', 'b', 'warm'), m('2026-09-03', '09:00', 'c', 'calm')]))).toBe('Mostly warm and calm this month.');
    expect(monthSummary(monthStats('2026-09', [m('2026-09-01', '09:00', 'a', 'warm'), m('2026-09-02', '09:00', 'b', 'warm'), m('2026-09-03', '09:00', 'c', 'warm'), m('2026-09-04', '09:00', 'c', 'calm')]))).toBe('Mostly warm this month.');
    expect(monthSummary(monthStats('2026-09', []))).toBe('Nothing felt yet this month.');
  });
  it('words reached for include the ones after "then"', () => expect(wordCounts([m('2026-09-01', '09:00', 'calm', 'calm', 'then tired, calm')]).slice(0, 2)).toEqual([['calm', { family: 'calm', n: 2 }], ['tired', { family: 'low', n: 1 }]]));
  it('a 1:30 am moment sits at hour 1 on the clock', () => { const h = hourMix([m('2026-09-02', '01:30', 'x', 'wistful')]); expect(h[1].parts).toEqual([['wistful', 1]]); expect(h.length).toBe(24); });
  it('too few moments: says so instead of a pattern', () => expect(hourSummary(hourMix([m('2026-09-02', '09:30', 'x', 'tense')]))).toBe('Too few moments yet to see a pattern through the day.'));
  it('often together needs two days, and says the families', () => {
    const fams = new Map([['2026-09-01', { family: 'warm' as const, count: 1 }], ['2026-09-02', { family: 'warm' as const, count: 1 }]]);
    expect(oftenWith([e('2026-09-01', { tags: ['walk'] }), e('2026-09-02', { tags: ['walk'] }), e('2026-09-02', { tags: ['once'] })], fams)).toEqual([{ tag: 'walk', families: ['warm'] }]);
  });
  it('life: newest first, "written later" kept, "don’t bring back" left out, private hidden when locked', () => {
    const items = lifeItems([e('2019-06-14', { kind: 'past', text: 'Graduation', data: { kind: 'past' } }), e('2026-09-21', { text: 'first chai', marks: { first: true } }), e('2024-01-01', { text: 'secret', marks: { first: true, priv: true } }), e('2023-01-01', { text: 'gone', marks: { first: true, quiet: true } })], [], [{ name: 'Home 2', lat: 0, lon: 0, from: '2025-07-01' }], lk, true);
    expect(items.map(i => i.text)).toEqual(['first chai', 'Moved to Home 2', 'A private entry. Unlock to read.', 'Graduation']);
    expect(items[3].later).toBe(true);
  });
});
```

`tired` is in the Low family in the atlas; the test uses `feelingOf` for words in `about`. Check this in `src/vocab/atlas.json` at implementation time.

Run: `npx vitest run tests/looking.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement `looking.ts`**

```ts
import type { DayRow, Entry, Moment, Person, Span } from '../db/types';
import { FAMILIES, FAMILY_NAME, feelingOf, type Family } from '../vocab/vocab';
import { addDays } from './day';
import { entryLine, type Lookup } from './entryText';

export function suggestedOverall(moments: Moment[]) {
  if (!moments.length) return undefined;
  const n = new Map<Family, number>(); moments.forEach(m => n.set(m.family, (n.get(m.family) ?? 0) + 1));
  const top = [...n.entries()].sort((a, b) => b[1] - a[1])[0][0], latest = [...moments].filter(m => m.family === top).sort((a, b) => b.at - a.at)[0];
  return { word: latest.word, family: top, strength: 3 };
}
export function dayFamilies(moments: Moment[], rows: DayRow[]) {
  const byDay = new Map<string, Moment[]>(); moments.forEach(m => byDay.set(m.day, [...(byDay.get(m.day) ?? []), m]));
  const out = new Map<string, { family: Family; count: number }>();
  for (const d of new Set([...byDay.keys(), ...rows.filter(r => r.overall).map(r => r.day)])) {
    const ms = byDay.get(d) ?? [], fam = rows.find(r => r.day === d)?.overall?.family ?? suggestedOverall(ms)?.family;
    if (fam) out.set(d, { family: fam, count: ms.length });
  }
  return out;
}
export function yearDays(year: number, fams: Map<string, { family: Family; count: number }>) {
  const out: { day: string; family?: Family; v: number }[] = [];
  for (let d = `${year}-01-01`; d.startsWith(String(year)); d = addDays(d, 1)) { const f = fams.get(d); out.push({ day: d, family: f?.family, v: f ? Math.min(1, Math.max(0.2, f.count / 5)) : 0 }); }
  return out;
}
export function monthStats(month: string, moments: Moment[]) {
  const counts = Object.fromEntries(FAMILIES.map(f => [f, 0])) as Record<Family, number>;
  moments.filter(m => m.day.startsWith(month)).forEach(m => counts[m.family]++);
  const total = Object.values(counts).reduce((a, b) => a + b, 0), top = [...FAMILIES].filter(f => counts[f]).sort((a, b) => counts[b] - counts[a]).slice(0, 2);
  return { counts, total, top };
}
export function monthSummary(s: { counts: Record<Family, number>; top: Family[] }) {
  if (!s.top.length) return 'Nothing felt yet this month.';
  const [a, b] = s.top, name = (f: Family) => FAMILY_NAME[f].toLowerCase();
  return b && s.counts[b] * 2 >= s.counts[a] ? `Mostly ${name(a)} and ${name(b)} this month.` : `Mostly ${name(a)} this month.`;
}
export function wordCounts(moments: Moment[]) {
  const c = new Map<string, { family: Family; n: number }>();
  const add = (w: string, fam: Family) => { const k = w.trim().toLowerCase(); if (!k) return; const x = c.get(k); c.set(k, { family: x?.family ?? fam, n: (x?.n ?? 0) + 1 }); };
  moments.forEach(m => { add(m.word, m.family); (m.about?.replace(/^then /, '').split(', ') ?? []).forEach(w => add(w, feelingOf(w, {})?.family ?? m.family)); });
  return [...c].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0])).slice(0, 10);
}
export function hourMix(moments: Moment[]) {
  return Array.from({ length: 24 }, (_, hour) => {
    const ms = moments.filter(m => new Date(m.at).getHours() === hour), n = new Map<Family, number>(); ms.forEach(m => n.set(m.family, (n.get(m.family) ?? 0) + 1));
    return { hour, parts: [...n].sort((a, b) => b[1] - a[1]).map(([f, k]) => [f, k / ms.length] as [Family, number]) };
  });
}
// hourSummary: count moments per quarter from hourMix (the caller passes raw counts: keep a `counts` field in hourMix's items)
```

Give each `hourMix` item a `count: number` for `hourSummary`. Write `hourSummary`, `oftenWith`, `peopleWith` and `lifeItems` to their Interfaces, in the same plain style: `Map` counts, sorted, sliced. `lifeItems` builds its text with `entryLine(e, lookup)` and removes the `Written later: ` prefix for `past` entries.

- [ ] **Step 3: Run, then commit**

Run: `npx vitest run tests/looking.test.ts && npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: looking back, as plain numbers and sentences"
```

---

### Task 4: The Year tab (ring and pixels)

**Files:**
- Create: `src/draw/year.ts`, `src/screens/calendar/Year.tsx`
- Test: `tests/year.test.ts`, plus additions to `tests/calendar-tabs.test.tsx`

**Interfaces:**
- `ringGeom(w, h, n)`: `{ cx, cy, R0, L, angOf(i) }`, ported from the design's `yearGeom`, with month gaps.
- `ringHit(x, y, w, h, days: { day: string }[]): number`: the day index, or -1 outside the band. It uses the design's `yearHit`.
- `pixelGeom(w, h)` and `pixelHit(x, y, w, h, year): number`: -1 outside, or on a day number past the month's end (for example 31 February).
- `drawYearRing(ctx, look, w, h, days, today: number, pick: number)` and `drawYearPixels(ctx, look, w, h, days, today, pick)`, ported from `drawYearRadial` and `drawYearPixels`:
  - the centre text is the year and "{n} days kept";
  - the "mostly {family}" line uses `drawSmall` plus words;
  - empty days are faint dots.
- `YearView({ year, days, style, pick, onStyle, onPick, onYear })`:
  - the `.ystyle` chips are Ring and Pixels;
  - the canvas has `tabindex="0"`, and ArrowLeft/ArrowRight move `pick` by a day and ArrowUp/ArrowDown by a week, clamped to the year;
  - a pointer tap uses the hit functions;
  - the pick sheet ports `yearPickSheet`: date, glyph, "Mostly {family}: {words}.", Day before, Open this day, and Day after, or "Not written yet. This day is still ahead." for future days, or "Nothing kept on this day." for past empty days;
  - under the canvas is a summary sentence with the top family per quarter, e.g. "Mostly calm in January to March, warm since July.", built by `yearSummary(days)` in `looking.ts`, plus the `formKey`;
  - the year arrows only go up to the current year.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { pixelHit, ringGeom, ringHit } from '../src/draw/year';
import { yearDays } from '../src/domain/looking';

const days = yearDays(2026, new Map());
describe('year hit-testing', () => {
  it('a tap on a day’s spoke finds that day, and the middle or outside finds nothing', () => {
    const g = ringGeom(400, 400, days.length), a = g.angOf(100), r = g.R0 + g.L / 2;
    expect(ringHit(g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r, 400, 400, days)).toBe(100);
    expect(ringHit(200, 200, 400, 400, days)).toBe(-1); expect(ringHit(2, 2, 400, 400, days)).toBe(-1);
  });
  it('pixels: 31 February is nothing, and 29 February exists only in leap years', () => {
    expect(pixelHit(...cell(1, 30), 360, 420, 2026)).toBe(-1);
    expect(pixelHit(...cell(1, 28), 360, 420, 2026)).toBe(-1); expect(pixelHit(...cell(1, 28), 360, 420, 2028)).toBe(59);
    expect(pixelHit(...cell(0, 0), 360, 420, 2026)).toBe(0);
  });
});
// centre of month mo (0-11), day d (0-based) in a 360x420 canvas, using the same geometry as the drawing
function cell(mo: number, d: number): [number, number] { const top = 22, left = 30, cw = (360 - left - 2) / 12, ch = (420 - top - 2) / 31; return [left + mo * cw + cw / 2, top + d * ch + ch / 2]; }
```

Add to `tests/calendar-tabs.test.tsx`:
- the Year view for 2026 with 1 kept day says "1 day kept" in the canvas label, and the summary names that family;
- a year with nothing kept says "Nothing kept in 2026 yet.";
- the pick sheet for a future day says "still ahead";
- the pick sheet for 1 January has no "Day before" button.

Run: `npx vitest run tests/year.test.ts tests/calendar-tabs.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

Port the drawings from `design/pinboard8-source/p7-scenes.js:2-30` and `p4-pixels.js:2-18`, replacing the design globals:
- `yearDays()` becomes the `days` argument;
- `INTENSITY[i]` becomes `days[i].v`;
- `TODAY_I` becomes `today`;
- `ST.yearPick` becomes `pick`;
- `LENS` becomes the month lengths computed for the year (February 29 in leap years);
- `pal()` and `ground()` become `look`.

The canvas's accessible name is "{year} as a ring of days: {n} days kept, mostly {family}. Tap a day, or use the arrow keys, to read it."

- [ ] **Step 3: Run, check in the browser, commit**

Run: `npm test && npm run typecheck`. Expected: PASS. In the browser, check both styles at 375 px, then tap a spoke, use the arrow keys, and use Day before/after.

```bash
git add -A src tests && git commit -m "feat: the year as a ring or pixels, by tap or arrow keys"
```

---

### Task 5: Gallery and Life

**Files:**
- Create: `src/screens/calendar/Gallery.tsx`, `src/screens/calendar/Life.tsx`
- Modify: `src/draw/day.ts` (a `small` option)
- Test: `tests/calendar-tabs.test.tsx` (additions)

**Interfaces:**
- `drawBloomLine(ctx, look, w, h, t, moments, overall, opts?: { small?: boolean })`: `small` drops labels and thin detail, and draws at cell size.
- `GalleryView({ month, today, cells: Record<string, DayMoment[] & overall> , onOpen })`:
  - the grid ports `calBody`'s gallery: a `.gal` grid with a `.gc2` button per kept day, each with a non-animated `Scene` (`bloomLine` small) and its day number;
  - the `aria-label` is "{d} {Month}: mostly {family}, {n} moments";
  - empty and future days are dimmed;
  - the hint is "Each day as a small bloom: forms sit at the hour you felt them. Tap one to read it."
  - Tapping opens the day page.
- `LifeView({ items, onAdd })`: ports `lifeBody`.
  - Each `.lifeitem` shows the year in bold, a glyph (the day's family, or the Firsts icon when it has none), the text, "Written later" when it applies, and a `.spanbar.wide` for spans.
  - It ends with an "Add something from before" button that goes to `form:past`.
  - With no items: "Your life’s big days gather here: firsts, trips, moves and things from before."

- [ ] **Step 1: Write the failing tests** (add to `tests/calendar-tabs.test.tsx`)

```tsx
it('gallery: a bloom per kept day, named in words', () => {
  const html = renderToStaticMarkup(<GalleryView month="2026-09" today="2026-09-29" cells={{ '2026-09-12': { overall: 'calm', moments: [{ h: 9, family: 'calm', strength: 3 }] } }} onOpen={() => {}} />);
  expect(html).toContain('aria-label="12 September: mostly calm, 1 moment"'); expect(html).not.toMatch(/undefined|NaN/);
});
it('life: newest first, written later marked, empty state kind', () => {
  expect(renderToStaticMarkup(<LifeView items={[{ year: 2019, day: '2019-06-14', text: 'Graduation', later: true }]} onAdd={() => {}} />)).toMatch(/2019[^]*Graduation[^]*Written later[^]*Add something from before/);
  expect(renderToStaticMarkup(<LifeView items={[]} onAdd={() => {}} />)).toContain('Your life’s big days gather here');
});
```

Run: `npx vitest run tests/calendar-tabs.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement, run the tests, check in the browser, commit**

The containers use `toDayMoments` (DayPage), `dayFamilies`, and `lifeItems` with the lock state from Task 7. Until Task 7 lands, pass `locked=false` and leave the `TODO(lock)` marker in no file: wire `usePrivacy` in Task 7 instead.

Run: `npm test && npm run typecheck`. Expected: PASS. In the browser, check that a month of blooms is readable at 375 px (each cell at least 44 px) and that the Life list reads top to bottom.

```bash
git add -A src tests && git commit -m "feat: the gallery of blooms, and your life at a glance"
```

---

### Task 6: The Feelings tab

**Files:**
- Create: `src/draw/clock.ts`, `src/screens/calendar/Feelings.tsx`
- Test: `tests/calendar-tabs.test.tsx` (additions)

**Interfaces:**
- `drawClock(ctx, look, w, h, mix)`: ports `drawClock`. `HOURMIX` becomes `mix[hour].parts`, and the height is `mix[hour].count / maxCount`. With no moments it draws only the empty ring and the noon and midnight labels.
- `FeelingsView({ month, stats, words, mix, often, withPeople, sel, onSel, daysWith })`: ports `emoBody`.
  - `.emo-sum` holds `monthSummary`.
  - "The nine, this month" is a 3×3 `.emogrid` of `.emocell` buttons, each with a small form, the family name and "{n} moments", with `aria-pressed`.
  - Selecting one shows the `.sel-box`: "{d} days had some {family} in them. Your words for it: {…}." and a `.minical`. Lit days carry a hidden ", lit" for screen readers.
  - "Words you reached for" shows chips "{word} · {n}". Selecting one shows "{d} days you felt {word}." and the word's meaning from the vocabulary, with a minical.
  - "Through the day" shows the canvas (`aria-label` = `hourSummary`) and the same sentence as text.
  - "Often together" shows tag chips, "often with", and forms plus family names.
  - "Who you were with" shows faces, "days together were often", and forms plus family names.
  - The hint stays: "The feelings that most often share a day with each tag. Nothing here is better or worse."
  - Empty sections say so ("No tags on two or more days yet.", "No days with people yet.").

- [ ] **Step 1: Write the failing tests** (add to `tests/calendar-tabs.test.tsx`)

```tsx
it('feelings: the nine with counts, words, a clock in words, and kind empty states', () => {
  const html = renderToStaticMarkup(<FeelingsView month="2026-09" stats={{ counts: { bright: 0, proud: 0, curious: 0, calm: 2, warm: 3, wistful: 0, low: 0, tense: 0, heated: 0 }, total: 5, top: ['warm', 'calm'] }} words={[['calm', { family: 'calm', n: 2 }]]}
    mix={Array.from({ length: 24 }, (_, hour) => ({ hour, parts: [], count: 0 }))} often={[]} withPeople={[]} sel={{ kind: 'fam', key: 'warm' }} onSel={() => {}} daysWith={['2026-09-03']} />);
  expect(html).toContain('Mostly warm and calm this month.'); expect(html).toContain('3 moments'); expect(html).toContain('calm · 2');
  expect(html).toContain('1 day had some warm in them'); expect(html).toContain('Too few moments yet to see a pattern through the day.');
  expect(html).toContain('No tags on two or more days yet.'); expect(html).toContain('Nothing here is better or worse.'); expect(html).not.toMatch(/NaN|Infinity|undefined/);
});
```

Run: `npx vitest run tests/calendar-tabs.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement, run the tests, check in the browser, commit**

Run: `npm test && npm run typecheck`. Expected: PASS. In the browser, check the 3×3 grid at 375 px and at 150% text (the design's `auto-fit` rule applies), and check that the clock's labels stay inside the canvas.

```bash
git add -A src tests && git commit -m "feat: the Feelings tab — the nine, your words, the day's clock, and who and what came together"
```

---

### Task 7: The private lock

**Files:**
- Create: `src/domain/lock.ts`, `src/ui/Privacy.tsx`
- Modify:
  - `src/db/types.ts`: `Settings.lock?: { credentialId: string; createdAt: number }`
  - `src/App.tsx`: wrap in `PrivacyProvider`
  - `src/screens/KeptCard.tsx`, `src/screens/DayPage.tsx`, `src/screens/Shelves.tsx`, `src/screens/Search.tsx`, `src/screens/calendar/Life.tsx`, `src/screens/calendar/Feelings.tsx`, `src/screens/Settings.tsx`
- Test: `tests/lock.test.tsx`

**Interfaces:**
- `lock.ts`:
  - `type Creds = { create(o: CredentialCreationOptions): Promise<Credential | null>; get(o: CredentialRequestOptions): Promise<Credential | null> }`
  - `lockSupport(win = globalThis): Promise<boolean>`: true when `window.isSecureContext`, `PublicKeyCredential` exists, and `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` resolves true.
  - `createLock(creds, rpId, rand = crypto.getRandomValues): Promise<{ credentialId: string }>`: `publicKey: { rp: { name: 'Logbook', id: rpId }, user: { id: random 16 bytes, name: 'logbook', displayName: 'Logbook' }, challenge: random 32 bytes, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000 }`. It stores `rawId` as base64url.
  - `unlock(creds, rpId, credentialId): Promise<boolean>`: `get({ publicKey: { challenge: random, allowCredentials: [{ type: 'public-key', id }], userVerification: 'required', rpId, timeout: 60000 } })`. It returns true when a credential came back, false on `NotAllowedError` (the owner cancelled), and rethrows anything else as `LockError('Logbook couldn’t use your fingerprint or PIN.')`.
- `Privacy.tsx`:
  - `PrivacyProvider` reads `settings.lock`. `locked = !!settings.lock && !unlockedAt`.
  - `unlock()` calls `domain/lock.unlock(navigator.credentials, location.hostname, id)`.
  - It locks again on `visibilitychange` to hidden and after 5 minutes.
  - `usePrivacy(): { enabled: boolean; locked: boolean; unlock(): Promise<boolean>; lockNow(): void }`
  - `LockedEntry({ onUnlock })`: `<div className="ent locked"><p className="entry"><Icon name="lock" /> A private entry. Unlock to read.</p><button className="btn sm">Unlock</button></div>`
- Where it applies:
  - `KeptCard`: `entry.marks.priv && locked` renders `LockedEntry`, keeping the time and marks row.
  - Search leaves out private entries while locked and adds "Some private entries aren’t searched while locked."
  - Shelves, tag and person lists render `LockedEntry` through KeptCard. Quotes and Firsts shelves use the placeholder text.
  - Life uses the `lifeItems` placeholder. Feelings' `wordCounts` leaves out the words of moments whose entry is private.
  - The calendar forms stay: feelings are shown as forms, not text.
- **Settings, Privacy section:**
  - "Lock private entries" is a switch.
  - Turning it on runs `lockSupport`. If that's false: "This phone’s browser can’t use your fingerprint or PIN here." and the switch stays off. If true: `createLock`, then save `settings.lock`.
  - Turning it off needs `unlock()`, then clears `settings.lock`.
  - When on, a "Set up the lock again" button re-registers through `createLock`, which needs the fingerprint or PIN.
  - The honest line: "This hides private entries inside Logbook. It isn’t encryption: your phone’s own lock protects the data."
  - Export, backup and restore call `unlock()` first while the lock is on.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLock, lockSupport, unlock } from '../src/domain/lock';
import { KeptCard } from '../src/screens/KeptCard';
import { PrivacyContext } from '../src/ui/Privacy';
import { searchAll } from '../src/domain/search';

const cred = (id: number[]) => ({ rawId: new Uint8Array(id).buffer, type: 'public-key', id: 'x' }) as unknown as Credential;
const lk = { places: new Map(), spans: new Map(), people: new Map() };
const priv = { id: 1, day: '2026-09-29', at: 0, tz: 'UTC', kind: 'line' as const, text: 'the secret thing', marks: { priv: true }, tags: [], people: [], writtenAt: 0 };
describe('the private lock', () => {
  it('asks for the phone’s own fingerprint or PIN, nothing else', async () => {
    let seen: CredentialCreationOptions | undefined;
    const r = await createLock({ create: async o => { seen = o; return cred([1, 2, 3]); }, get: async () => null }, 'localhost');
    expect(r.credentialId).toBe('AQID'); expect(seen?.publicKey?.authenticatorSelection).toMatchObject({ authenticatorAttachment: 'platform', userVerification: 'required' });
  });
  it('unlock: yes, a cancel, or a plain error', async () => {
    expect(await unlock({ create: async () => null, get: async () => cred([1]) }, 'localhost', 'AQ')).toBe(true);
    expect(await unlock({ create: async () => null, get: async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }); } }, 'localhost', 'AQ')).toBe(false);
    await expect(unlock({ create: async () => null, get: async () => { throw new Error('x'); } }, 'localhost', 'AQ')).rejects.toThrow('couldn’t use your fingerprint or PIN');
  });
  it('a browser without a platform authenticator is not supported', async () => { expect(await lockSupport({ isSecureContext: true } as never)).toBe(false); expect(await lockSupport({ isSecureContext: false, PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: async () => true } } as never)).toBe(false); });
  it('while locked, a private entry shows no text anywhere, only a quiet placeholder', () => {
    const html = renderToStaticMarkup(<PrivacyContext.Provider value={{ enabled: true, locked: true, unlock: async () => true, lockNow: () => {} }}><KeptCard entry={priv} lookup={lk} own={{}} onOpenFeeling={() => {}} /></PrivacyContext.Provider>);
    expect(html).not.toContain('secret'); expect(html).toContain('A private entry. Unlock to read.');
    expect(searchAll('secret', { entries: [priv], tags: [], people: [], own: {}, lookup: lk, locked: true }).lines).toEqual([]);
  });
  it('unlocked, it reads as usual', () => expect(renderToStaticMarkup(<PrivacyContext.Provider value={{ enabled: true, locked: false, unlock: async () => true, lockNow: () => {} }}><KeptCard entry={priv} lookup={lk} own={{}} onOpenFeeling={() => {}} /></PrivacyContext.Provider>)).toContain('the secret thing'));
});
```

Also add a Settings test: with `lockSupported={false}`, the switch is `aria-checked="false"`, it's disabled, and the reason is shown. With the lock on, the honest line and "Set up the lock again" are shown.

Run: `npx vitest run tests/lock.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement `lock.ts`**

```ts
export class LockError extends Error { constructor() { super('Logbook couldn’t use your fingerprint or PIN.'); this.name = 'PlainMessage'; } }
export type Creds = { create(o: CredentialCreationOptions): Promise<Credential | null>; get(o: CredentialRequestOptions): Promise<Credential | null> };
const b64u = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));
/* The phone's own fingerprint or PIN, through a passkey that never leaves it. There is no server: this only asks the phone to confirm it's the owner. */
export async function lockSupport(w: { isSecureContext?: boolean; PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } } = globalThis as never): Promise<boolean> {
  try { return !!w.isSecureContext && !!(await w.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.()); } catch { return false; }
}
export async function createLock(creds: Creds, rpId: string): Promise<{ credentialId: string }> {
  const c = await creds.create({ publicKey: { rp: { name: 'Logbook', id: rpId }, user: { id: rand(16), name: 'logbook', displayName: 'Logbook' }, challenge: rand(32),
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60_000 } }).catch(() => null);
  if (!c) throw new LockError();
  return { credentialId: b64u((c as PublicKeyCredential).rawId) };
}
export async function unlock(creds: Creds, rpId: string, credentialId: string): Promise<boolean> {
  try { return !!(await creds.get({ publicKey: { challenge: rand(32), allowCredentials: [{ type: 'public-key', id: unb64u(credentialId) }], userVerification: 'required', rpId, timeout: 60_000 } })); }
  catch (e) { if ((e as Error).name === 'NotAllowedError') return false; throw new LockError(); }
}
```

The `LockError` name `'PlainMessage'` lets `failMessage` show its own words. That was set up in 2b.

- [ ] **Step 3: Implement the provider, then wire it into every surface listed in Interfaces**

`searchAll` gains `locked?: boolean` and filters `e.marks.priv` when true.

- [ ] **Step 4: Run the tests, check by hand, commit**

Run: `npm test && npm run typecheck`. Expected: PASS.

In the browser pane, WebAuthn needs a platform authenticator. Use the Chromium DevTools WebAuthn virtual authenticator if it's available; otherwise record this in the ledger and leave the phone check to the owner. Then:
1. Mark a line Private and turn the lock on.
2. Leave and return to the app. Expect the placeholder on Today, the day page, search and the Firsts shelf.
3. Unlock. Expect the text back.

```bash
git add -A src tests && git commit -m "feat: private entries behind your fingerprint or PIN"
```

---

### Task 8: The whole-app check

**Files:**
- Modify: `tests/screens-2a.test.tsx` (add the Gallery, Year, Life, Feelings and LockedEntry views, each empty and full, locked and unlocked)

- [ ] **Step 1: Add the views to the clean-render check.** Expected: no `undefined`, `NaN`, `Infinity` or `[object Object]`.

- [ ] **Step 2: Run everything**

Run: `npm test && npm run typecheck && npm run build`. Expected: PASS.

- [ ] **Step 3: The probe and the walk-through**

Run the probe (`scripts/probe.md`) on each calendar tab, with a sheet open on Year, at 100% and 150%. Expected: `small` and `tiny` empty, `over` false.

Walk-through:
1. Keep a week of feelings, with tags and a person.
2. Check the Feelings tab's sentences match the data.
3. On Year, move by arrow keys across 31 December and 1 January.
4. On Life, check a thing from before is marked "Written later".
5. Turn the lock on and search for private text. Expect nothing.

- [ ] **Step 4: Commit and hand over**

```bash
git add -A src tests && git commit -m "test: Stage 2c whole-app check; Stage 2 complete"
```

Don't merge or push. Tell the owner Stage 2c is ready and ask how to finish the branch.
