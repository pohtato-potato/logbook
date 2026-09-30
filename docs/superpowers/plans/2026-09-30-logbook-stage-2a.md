# Logbook Stage 2a (Keeping more) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything in the + sheet can be kept and read back:
- photos, with a photo of the day;
- films, books and shows on the 1–7 scale, with Currently;
- quotes;
- places, on Logbook's own drawn map;
- people seen, called or messaged;
- keepsakes, voice notes, spans of days, and big moments from before ("written later").

Alongside that come Shelves, person pages, tag pages and search. The Stage 1 loose ends are closed first. **Stage 2a makes no network requests**: place names are typed, and suggestions from OpenStreetMap arrive in 2b with the other online sources.

**Architecture:**
- Same shape as Stage 1:
  - pure logic in `src/domain`, tested directly;
  - Dexie actions in `src/db`, each returning an `Undo`;
  - screens split into a pure `…View` (tested with `renderToStaticMarkup`) and a thin `useLiveQuery` container.
- Every kind of entry is one row in `entries`, with `kind` and a typed `data` field. The database goes to version 2 only to index `kind`.
- Photos and voice notes are Blobs in IndexedDB. The Markdown export and the backup carry them as files.

**Tech Stack:** unchanged from Stage 1 (Vite 8, React 19, TypeScript 7, Dexie 4, vite-plugin-pwa, Vitest 5 + fake-indexeddb). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-30-logbook-design.md`. Stage 1's plan (`docs/superpowers/plans/2026-09-30-logbook-stage-1.md`) shows the patterns. The approved look is `design/logbook-pinboard-8.html`, with its source in `design/pinboard8-source/`: `p7-screens2.js` (`pForm`, `keptCard`, `pShelves`, `pShelf`, `pPerson`, `pTag`, `searchResults`), `p7-screens.js` (`keptCard`) and `p7-scenes2.js` (`drawPlaceMap`).

## Global Constraints

- Everything in Stage 1's Global Constraints still holds: the address, the `logbook` database, no personal data in the repo, nothing loaded from outside, the 4 am day, night 12–5 am, dark by default, rem sizes (16 / 14 / 13 px minimum), 44 px controls (36 px for chips inside sentences), colour never alone, never judging feelings, and no pushes without the owner asking.
- **No network requests in Stage 2a.** Location is read only when the owner taps "Use where I am", once, never in the background. It is rounded to 3 decimal places (about 100 m) before it is stored.
- The microphone is used only while the owner holds a recording open, and only after the browser's own permission prompt.
- Photos are stored as 1600 px (long edge) JPEGs at quality 0.85, with 320 px thumbnails. Originals are never kept.
- The 1–7 scale words are exactly: 1 Complete garbage, 2 Terrible, 3 Bad, 4 Average, 5 Good, recommended, 6 Exceptional, 7 Masterpiece. Ratings never use feeling colours: just the number and its words.
- People are shown by initial and their chosen thread colour, never a feeling colour. Places use neutral ink, and firsts glow in the First mark's colour (bright).
- The tab bar becomes Today · Calendar · [+] · Shelves · Settings. In Stage 3, Almanac replaces Settings, which then moves to Today's header.
- Commit after each task on a local branch `stage-2a` made from `main`. Never push.

## Review Focus

1. **A place kept with no position** (the owner typed a name and never tapped "Use where I am"). It still saves, shows in the Places list, and is simply missing from the drawn map. It never becomes a dot at 0,0. Tests are in Task 6 and Task 7.
2. **A voice note when the microphone is refused or unsupported.** The form says so plainly, and nothing is saved. The tests are in Task 8.
3. **Big or odd photos** (a 12 MB image, a portrait photo, a PNG screenshot, a file that isn't an image). Big ones are resized, orientation is respected, and a non-image is refused with a message. Nothing half-saves. The tests are in Task 4.
4. **Something from before, dated in the future or before 1940.** The date field refuses future dates. Old dates are allowed and simply get no weather later (2b). The tests are in Task 7.
5. **Export and backup with photos and voice notes.** Every file lands in the zip or backup and comes back on restore, and a Markdown file links to its photos by relative path. The tests are in Task 9.

---

## File map (new or changed)

```
src/db/types.ts            + EntryKind, EntryData, MediaKind, Photo, Place, Span; DayRow.potd
src/db/db.ts               version(2): entries index kind; typed photos/places/spans
src/db/actions.ts          + keepEntry, addPlace, addSpan, setPhotoOfDay, setPersonThread; fixes from Task 1
src/db/photos.ts           addPhoto, removePhoto
src/domain/image.ts        fitSize (pure), resizeImage (browser)
src/domain/rating.ts       RATINGS, ratingText
src/domain/entryText.ts    entryLine(e, ctx): one readable line per entry kind (used by cards, export, search)
src/domain/search.ts       searchAll(q, data)
src/domain/people.ts       togetherStats(personInitial, entries, year)
src/domain/geo.ts          roundCoord, projection(points, w, h, pad)
src/draw/placeMap.ts       drawPlaceMap
src/screens/AddSheet.tsx   the + sheet
src/screens/forms/*.tsx    MediaForm, QuoteForm, PlaceForm, PersonForm, KeepForm, VoiceForm, SpanForm, PastForm, PhotoForm
src/screens/KeptCard.tsx   one card per entry kind (Today, day page, shelves, tag and person pages)
src/screens/Shelves.tsx    shelves index + one shelf page
src/screens/Person.tsx, TagPage.tsx, Search.tsx
src/router.ts              + add, form/:kind, shelves, shelf/:id, person/:id, tag/:tag, search
src/ui/Tabs.tsx            Shelves tab
tests/*.test.ts(x)         one per module
```

---

### Task 1: Stage 1 loose ends

**Files:**
- Modify: `src/domain/line.ts`, `src/domain/day.ts`, `src/domain/markdown.ts`, `src/domain/zip.ts`, `src/db/actions.ts`, `src/db/backup.ts`, `src/screens/Settings.tsx`, `src/screens/Today.tsx`, `src/screens/LineWriter.tsx`, `src/screens/FeelingPicker.tsx`, `src/draw/Canvas.tsx`, `src/App.tsx`, `tests/fixtures/starter.example.json`
- Test: `tests/loose-ends.test.ts`

**Interfaces:**
- Produces:
  - `timeLabelIn(at: number, tz: string): string`: the time as it was where it was written.
  - `saveFile(blob, name): Promise<boolean>`: true only if a file was actually saved.
  - `tokenize` now needs a word start for `#` and `@`.
  - Person tokens keep the typed name in `raw`, and `value` is its first letter in upper case (the initial).

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { tokenize } from '../src/domain/line';
import { timeLabelIn } from '../src/domain/day';
import { dayToMarkdown } from '../src/domain/markdown';
import { makeZip } from '../src/domain/zip';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepLine, removeFeelingFromEntry } from '../src/db/actions';
import { BackupError, makeBackup, restoreBackup } from '../src/db/backup';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('le-' + n++); await db.open(); });

describe('loose ends', () => {
  it('# and @ only count at the start of a word', () => {
    expect(tokenize('mail a@gmail.com about C# and issue#12').length).toBe(0);
    expect(tokenize('with @Alex #walk').map(t => t.kind + ':' + t.value)).toEqual(['person:A', 'tag:walk']);
  });
  it('shows times where they were written', () => {
    const at = Date.UTC(2026, 8, 29, 17, 30); // 23:00 in India, 18:30 in London
    expect(timeLabelIn(at, 'Asia/Kolkata')).toBe('11:00 pm');
    expect(timeLabelIn(at, 'Europe/London')).toBe('6:30 pm');
  });
  it('export writes feelings as words and lists marks in the front matter', () => {
    const md = dayToMarkdown('2026-09-29', undefined, [{ id: 1, day: '2026-09-29', at: 0, tz: 'UTC', kind: 'line', text: 'felt :at-ease today', marks: { first: true }, tags: [], people: [], writtenAt: 0 }], []);
    expect(md).toContain('felt at ease today');
    expect(md).toMatch(/marks: \["first"\]/);
  });
  it('zip entries carry a real date', async () => {
    const b = new Uint8Array(await makeZip([{ path: 'a.md', data: 'x' }], new Date(2026, 8, 29, 12, 0)).arrayBuffer());
    const dv = new DataView(b.buffer); expect(dv.getUint16(12, true)).toBe(((2026 - 1980) << 9) | (9 << 5) | 29);
  });
  it('removing one of three feelings keeps the others’ own families', async () => {
    const r = await keepLine(db, { text: ':calm :pooped :excited', marks: {}, at: new Date('2026-09-29T22:00:00') }, {});
    await removeFeelingFromEntry(db, r.entryId, 'calm');
    expect((await db.moments.toArray())[0]).toMatchObject({ word: 'pooped', family: 'low', second: 'bright', about: 'then excited' });
  });
  it('undoing a kept line removes a tag it created', async () => {
    const r = await keepLine(db, { text: 'new #brandnew', marks: {}, at: new Date() }, {});
    await r.undo.run();
    expect(await db.tags.get('brandnew')).toBeUndefined();
  });
  it('refuses a backup with missing tables, and an unreadable one, with plain messages', async () => {
    const b = await makeBackup(db); delete (b.tables as Record<string, unknown>).moments;
    await expect(restoreBackup(db, b)).rejects.toThrow('isn’t complete');
    await expect(restoreBackup(db, 'not json at all')).rejects.toBeInstanceOf(BackupError);
  });
});
```

Run: `npx vitest run tests/loose-ends.test.ts`. Expected: FAIL (the `timeLabelIn` import is missing, and the other tests fail on their assertions).

- [ ] **Step 2: Fix them**

1. **`line.ts`:** change `TOKEN_RE` to `/((?<=^|\s)#[\p{L}\p{N}_-]+)|((?<=^|\s)@[A-Za-z]+)|((?<=^|\s):[\p{L}][\p{L}'-]*)/gu`. The person token's `value` becomes `raw.slice(1, 2).toUpperCase()`.
2. **`day.ts`:**
```ts
export function timeLabelIn(at: number, tz: string): string {
  const p = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).formatToParts(new Date(at));
  const h = p.find(x => x.type === 'hour')!.value, m = p.find(x => x.type === 'minute')!.value, ap = (p.find(x => x.type === 'dayPeriod')?.value ?? '').toLowerCase().replace(/\./g, '');
  return `${Number(h)}:${m} ${ap}`;
}
```
   Replace `timeLabel(new Date(e.at))` with `timeLabelIn(e.at, e.tz)` in `markdown.ts`, `Today.tsx` (kept cards) and `DayPage.tsx`. Moments have no `tz`, so they keep `timeLabel`.
3. **`markdown.ts`:**
   - Before writing `e.text`, replace each known feeling token with its plain word: `text.replace(/(^|\s):([\p{L}][\p{L}'-]*)/gu, (m, s, w) => feelingOf(w, {}) ? s + w.replace(/-/g, ' ') : m)`.
   - Add `marks: [...]` to the front matter when any entry that day has marks.
4. **`zip.ts`:**
   - `makeZip(files, when = new Date())`.
   - Write the DOS time at local-header offsets 10 and 12, and at central-directory offsets 12 and 14: `time = (h << 11) | (m << 5) | (s >> 1)`, `date = ((y - 1980) << 9) | (mo << 5) | d`.
5. **`actions.ts`:**
   - `removeFeelingFromEntry` takes `own` as a fourth parameter (default `{}`) and looks up each remaining word's family with `feelingOf(w, own)` instead of guessing.
   - `keepLine`'s Undo also deletes tag rows whose `created` equals this entry's `at` and which no other entry uses.
6. **`backup.ts`:**
   - `restoreBackup(db, data: unknown)` accepts a string, parsing it inside a try and throwing `BackupError('This file isn’t a Logbook backup. Nothing was changed.')` on bad JSON.
   - It refuses when any table key in `TABLES` is missing, with `BackupError('This backup isn’t complete. Nothing was changed.')`.
7. **`Settings.tsx`:**
   - `saveFile` returns `true` after a successful write or download, and `false` on AbortError.
   - Export only says "Exported" and records `lastExport` when it returns true.
   - Restore passes the raw text to `restoreBackup`.
8. **`Today.tsx`:** wrap `localStorage.getItem` in try/catch.
9. **`Canvas.tsx`:** add `document.addEventListener('visibilitychange', () => { if (!document.hidden) startMotion(); })` once, at module level, guarded by `typeof document !== 'undefined'`.
10. **`App.tsx`:** recompute `data-big-text` on `resize` as well.
11. **`LineWriter.tsx` and `FeelingPicker.tsx`:** add a `busy` ref that makes Keep ignore a second tap while a save is in flight. Disable the button while busy.
12. **`tests/fixtures/starter.example.json`:** change the coordinates to obviously fake ones (`"lat": 10.001, "lon": 20.001` and `"lat": 10.002, "lon": 20.002`).

- [ ] **Step 3: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all PASS.

- [ ] **Step 4: Check the double-tap guard by hand**

Run `npm run dev`, type a line, and double-click Keep quickly. Expected: one entry.

- [ ] **Step 5: Commit**

```bash
git add -A src tests && git commit -m "fix: Stage 1 loose ends (word-start tags and people, times where written, export words and marks, zip dates, backup checks, double-tap guard)"
```

---

### Task 2: One entry, many kinds (the data model)

**Files:**
- Modify: `src/db/types.ts`, `src/db/db.ts`, `src/db/actions.ts`, `src/db/backup.ts` (the `TABLES` list is unchanged)
- Create: `src/domain/rating.ts`
- Test: `tests/kinds.test.ts`

**Interfaces:**
- Produces (`types.ts`):
```ts
export type EntryKind = 'line' | 'media' | 'quote' | 'place' | 'person' | 'keep' | 'voice' | 'span' | 'past';
export type MediaKind = 'Film' | 'Series' | 'Book' | 'Game' | 'Album' | 'Other';
export type How = 'In person' | 'Call' | 'Messages';
export type EntryData =
  | { kind: 'media'; media: MediaKind; title: string; rating: number; current: boolean }
  | { kind: 'quote'; who: string; where?: string }          // who: a person's initial, 'Overheard' or 'A book or film'
  | { kind: 'place'; placeId: number; first: boolean }
  | { kind: 'person'; who: string[]; how: How }              // initials
  | { kind: 'keep'; photoId?: number }
  | { kind: 'voice'; audio: Blob; seconds: number; type: string }
  | { kind: 'span'; spanId: number }
  | { kind: 'past' };
// Entry: kind: EntryKind; data?: EntryData   (text holds the entry's own words: the line, the quote, the title's note, the keepsake's name…)
export type Photo = { id?: number; day: string; blob: Blob; thumb: Blob; takenAt?: number; addedAt: number };
export type Place = { id?: number; name: string; lat?: number; lon?: number; first: boolean; visits: number };
export type Span = { id?: number; name: string; from: string; to: string; family: Family };
// DayRow gains potd?: number (the photo of the day's id)
```
- `rating.ts`: `RATINGS: [number, string][]` and `ratingText(r: number): string`, e.g. `'6 of 7 · Exceptional'`.
- `actions.ts`:
  - `type EntryDraft = { kind: Exclude<EntryKind, 'line'>; text: string; data: EntryData; marks?: Marks; people?: string[]; at: Date; day?: string }`
  - `keepEntry(db, d: EntryDraft): Promise<{ entryId: number; undo: Undo }>`
    - `day` defaults to `dayKey(at)`; for `past` it is the chosen date, and `writtenAt` is always now.
    - For `place`, keeping increments `places.visits`, and Undo decrements it.
    - For `person`, `people = who`.
  - `addPlace(db, p: { name: string; lat?: number; lon?: number; first: boolean }): Promise<number>`: trims the name. If a place with the same name (case-insensitive) exists, return its id instead of adding.
  - `addSpan(db, s: Omit<Span, 'id'>): Promise<number>`: refuses `to < from` with `Error('The span ends before it starts.')`.
  - `setPhotoOfDay(db, day: string, photoId: number | null): Promise<Undo>`
  - `setPersonThread(db, id: string, thread: number): Promise<void>`

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { addPlace, addSpan, keepEntry, setPhotoOfDay } from '../src/db/actions';
import { RATINGS, ratingText } from '../src/domain/rating';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('k-' + n++); await db.open(); });
const at = new Date('2026-09-29T21:00:00');

describe('the 1–7 scale', () => {
  it('uses the approved words', () => {
    expect(RATINGS.map(r => r[1])).toEqual(['Complete garbage', 'Terrible', 'Bad', 'Average', 'Good, recommended', 'Exceptional', 'Masterpiece']);
    expect(ratingText(6)).toBe('6 of 7 · Exceptional');
  });
});
describe('keeping other kinds', () => {
  it('keeps a film with its rating and Currently, and undoes it', async () => {
    const r = await keepEntry(db, { kind: 'media', text: 'Quietly wrecked me.', data: { kind: 'media', media: 'Film', title: 'Past Lives', rating: 6, current: false }, at });
    expect(await db.entries.where('kind').equals('media').count()).toBe(1);
    await r.undo.run(); expect(await db.entries.count()).toBe(0);
  });
  it('a place visit counts, and Undo takes it back; the same name is the same place', async () => {
    const id = await addPlace(db, { name: 'The chai stall ', first: false });
    expect(await addPlace(db, { name: 'the CHAI stall', first: false })).toBe(id);
    const r = await keepEntry(db, { kind: 'place', text: '', data: { kind: 'place', placeId: id, first: false }, at });
    expect((await db.places.get(id))?.visits).toBe(1);
    await r.undo.run(); expect((await db.places.get(id))?.visits).toBe(0);
  });
  it('something from before goes on its own date but remembers when it was written', async () => {
    const r = await keepEntry(db, { kind: 'past', text: 'Graduation day.', data: { kind: 'past' }, at, day: '2022-06-14' });
    const e = await db.entries.get(r.entryId);
    expect(e?.day).toBe('2022-06-14'); expect(e!.writtenAt).toBeGreaterThan(Date.UTC(2026, 0, 1));
  });
  it('a person entry records who', async () => {
    const r = await keepEntry(db, { kind: 'person', text: '', data: { kind: 'person', who: ['A', 'R'], how: 'Call' }, at });
    expect((await db.entries.get(r.entryId))?.people).toEqual(['A', 'R']);
  });
  it('refuses a span that ends before it starts', async () => {
    await expect(addSpan(db, { name: 'x', from: '2026-11-10', to: '2026-11-06', family: 'warm' })).rejects.toThrow('ends before it starts');
  });
  it('sets the photo of the day with Undo', async () => {
    const u = await setPhotoOfDay(db, '2026-09-29', 7);
    expect((await db.days.get('2026-09-29'))?.potd).toBe(7);
    await u.run(); expect((await db.days.get('2026-09-29'))?.potd).toBeUndefined();
  });
});
```

Run: `npx vitest run tests/kinds.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement**

`src/domain/rating.ts`:
```ts
/* The 1–7 scale (from the owner): 4 is the true middle. Ratings never use feeling colours. */
export const RATINGS: [number, string][] = [[1, 'Complete garbage'], [2, 'Terrible'], [3, 'Bad'], [4, 'Average'], [5, 'Good, recommended'], [6, 'Exceptional'], [7, 'Masterpiece']];
export const ratingText = (r: number) => `${r} of 7 · ${RATINGS[Math.max(1, Math.min(7, Math.round(r))) - 1][1]}`;
```

In `db.ts`, add after `version(1)`:
```ts
    this.version(2).stores({ entries: '++id, day, at, kind, *tags, *people' });
```
and type `photos`, `places` and `spans` with `Photo`, `Place` and `Span`.

`actions.ts`, adding and reusing `guard` and `once`:
```ts
export type EntryDraft = { kind: Exclude<EntryKind, 'line'>; text: string; data: EntryData; marks?: Marks; people?: string[]; at: Date; day?: string };
export async function keepEntry(db: LogbookDb, d: EntryDraft) {
  const t = d.at.getTime(), day = d.kind === 'past' && d.day ? d.day : dayKey(d.at);
  const people = d.data.kind === 'person' ? d.data.who : d.people ?? [];
  return guard(() => db.transaction('rw', db.entries, db.places, async () => {
    const entryId = await db.entries.add({ day, at: t, tz: timeZone(), kind: d.kind, text: d.text.trim(), marks: { ...(d.marks ?? {}) }, tags: tagsOf(d.text), people, writtenAt: Date.now(), data: d.data });
    const placeId = d.data.kind === 'place' ? d.data.placeId : null;
    if (placeId != null) { const p = await db.places.get(placeId); if (p) await db.places.update(placeId, { visits: p.visits + 1 }); }
    return { entryId, undo: once('Kept', () => db.transaction('rw', db.entries, db.places, async () => {
      await db.entries.delete(entryId);
      if (placeId != null) { const p = await db.places.get(placeId); if (p) await db.places.update(placeId, { visits: Math.max(0, p.visits - 1) }); }
    })) };
  }));
}
export async function addPlace(db: LogbookDb, p: { name: string; lat?: number; lon?: number; first: boolean }): Promise<number> {
  const name = p.name.trim(), same = (await db.places.toArray()).find(x => x.name.toLowerCase() === name.toLowerCase());
  if (same) return same.id!;
  return guard(() => db.places.add({ name, lat: p.lat, lon: p.lon, first: p.first, visits: 0 }));
}
export async function addSpan(db: LogbookDb, s: Omit<Span, 'id'>): Promise<number> {
  if (s.to < s.from) throw new Error('The span ends before it starts.');
  return guard(() => db.spans.add({ ...s, name: s.name.trim() }));
}
export async function setPhotoOfDay(db: LogbookDb, day: string, photoId: number | null): Promise<Undo> {
  const before = await db.days.get(day), next = { ...(before ?? { day }) };
  if (photoId == null) delete next.potd; else next.potd = photoId;
  await guard(() => db.days.put(next));
  return once('Photo of the day', async () => { if (before) await db.days.put(before); else await db.days.delete(day); });
}
export async function setPersonThread(db: LogbookDb, id: string, thread: number) { await guard(() => db.people.update(id, { thread })); }
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/kinds.test.ts && npm test && npm run typecheck`
Expected: PASS. Stage 1's tests still pass: `line` entries have no `data`.

- [ ] **Step 4: Commit**

```bash
git add -A src tests && git commit -m "feat: entries of every kind, places, spans, photo of the day, and the 1–7 scale"
```

---

### Task 3: One readable line per entry (cards, export and search all use it)

**Files:**
- Create: `src/domain/entryText.ts`, `src/screens/KeptCard.tsx`
- Modify: `src/domain/markdown.ts` (use `entryLine`), `src/screens/Today.tsx` and `src/screens/DayPage.tsx` (render `KeptCard`)
- Test: `tests/entrytext.test.tsx`

**Interfaces:**
- Consumes: the types and `ratingText` (Task 2), `RichText` (Stage 1).
- Produces:
  - `type Lookup = { places: Map<number, Place>; spans: Map<number, Span>; people: Map<string, Person> }` (people are keyed by initial)
  - `entryLine(e: Entry, lk: Lookup): string`: a plain sentence with no codes, e.g.:
    - `Film: Past Lives, 6 of 7 · Exceptional. Quietly wrecked me.`
    - `“We’re not lost, we’re just early.” (overheard, on the trip)`
    - `Place: A new café by the metro (a first).`
    - `Called Friend A and Friend R.`
    - `Keepsake: Film ticket, Past Lives.`
    - `Voice note, 0:42.`
    - `Span: Diwali at home, 6 to 10 November.`
    - `Written later: Graduation day.`
    - a `line` returns its text with feelings as words.
  - `<KeptCard entry lookup own onOpenFeeling onOpenTag onOpenPerson onMenu photoUrl? />`: ports `keptCard` from `design/pinboard8-source/p7-screens.js`. Every kind shows its time (`timeLabelIn`) and marks. Ratings are neutral pills; people are `PersonChip`s; a voice note has an `<audio controls>` whose source is an object URL made from the blob.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { entryLine } from '../src/domain/entryText';
import { KeptCard } from '../src/screens/KeptCard';
import type { Entry, Place, Span, Person } from '../src/db/types';

const base = { id: 1, day: '2026-09-29', at: Date.UTC(2026, 8, 29, 15, 0), tz: 'UTC', marks: {}, tags: [], people: [], writtenAt: 0 };
const lk = { places: new Map<number, Place>([[3, { id: 3, name: 'A new café', first: true, visits: 1 }]]), spans: new Map<number, Span>([[4, { id: 4, name: 'Diwali at home', from: '2026-11-06', to: '2026-11-10', family: 'warm' }]]),
  people: new Map<string, Person>([['A', { id: 'a', initial: 'A', name: 'Friend A', thread: 0 }], ['R', { id: 'r', initial: 'R', name: 'Friend R', thread: 1 }]]) };
const e = (x: Partial<Entry>) => ({ ...base, kind: 'line', text: '', ...x }) as Entry;

describe('one readable line per kind', () => {
  it.each([
    [e({ kind: 'media', text: 'Quietly wrecked me.', data: { kind: 'media', media: 'Film', title: 'Past Lives', rating: 6, current: true } }), 'Film: Past Lives, 6 of 7 · Exceptional. Quietly wrecked me. (Currently watching)'],
    [e({ kind: 'quote', text: 'We’re just early.', data: { kind: 'quote', who: 'Overheard', where: 'on the trip' } }), '“We’re just early.” (overheard, on the trip)'],
    [e({ kind: 'quote', text: 'Chai tastes better.', data: { kind: 'quote', who: 'R' } }), '“Chai tastes better.” (Friend R)'],
    [e({ kind: 'place', data: { kind: 'place', placeId: 3, first: true } }), 'Place: A new café (a first).'],
    [e({ kind: 'person', data: { kind: 'person', who: ['A', 'R'], how: 'Call' } }), 'Called Friend A and Friend R.'],
    [e({ kind: 'keep', text: 'Film ticket', data: { kind: 'keep' } }), 'Keepsake: Film ticket.'],
    [e({ kind: 'voice', data: { kind: 'voice', audio: new Blob(), seconds: 42, type: 'audio/webm' } }), 'Voice note, 0:42.'],
    [e({ kind: 'span', data: { kind: 'span', spanId: 4 } }), 'Span: Diwali at home, 6 to 10 November.'],
    [e({ kind: 'past', text: 'Graduation day.', data: { kind: 'past' } }), 'Written later: Graduation day.'],
    [e({ kind: 'line', text: 'felt :at-ease #walk' }), 'felt at ease #walk'],
  ])('%#', (entry, line) => expect(entryLine(entry, lk)).toBe(line));
  it('a missing place or span still reads, and never prints undefined', () => {
    expect(entryLine(e({ kind: 'place', data: { kind: 'place', placeId: 99, first: false } }), lk)).toBe('Place: a place that was removed.');
  });
});
describe('kept cards', () => {
  it('shows a rating as a neutral pill with its words, never a feeling colour', () => {
    const html = renderToStaticMarkup(<KeptCard entry={e({ kind: 'media', text: '', data: { kind: 'media', media: 'Book', title: 'X', rating: 4, current: false } })} lookup={lk} own={{}} onOpenFeeling={() => {}} onMenu={() => {}} />);
    expect(html).toContain('4 of 7 · Average'); expect(html).toContain('class="rating"'); expect(html).not.toMatch(/--fc/);
  });
});
```

Run: `npx vitest run tests/entrytext.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement `entryText.ts`**

```ts
import type { Entry, Person, Place, Span } from '../db/types';
import { ratingText } from './rating';
import { feelingOf } from '../vocab/vocab';
import { parseDay } from './day';

export type Lookup = { places: Map<number, Place>; spans: Map<number, Span>; people: Map<string, Person> };
const words = (t: string) => t.replace(/(^|\s):([\p{L}][\p{L}'-]*)/gu, (m, s: string, w: string) => (feelingOf(w, {}) ? s + w.replace(/-/g, ' ') : m));
const name = (lk: Lookup, i: string) => lk.people.get(i)?.name ?? `Friend ${i}`;
const list = (xs: string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const dm = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
const range = (a: string, b: string) => { const [x, y] = [dm(a), dm(b)]; const [dx, mx] = x.split(' '), [dy, my] = y.split(' '); return mx === my ? `${dx} to ${dy} ${my}` : `${x} to ${y}`; };
const DOING = { Film: 'watching', Series: 'watching', Book: 'reading', Game: 'playing', Album: 'listening', Other: 'on it' } as const;
const HOW = { 'In person': 'Saw', Call: 'Called', Messages: 'Messaged' } as const;
/* One plain sentence for any entry: the same words on cards, in the Markdown export and in search. */
export function entryLine(e: Entry, lk: Lookup): string {
  const d = e.data, text = words(e.text).trim();
  if (!d) return text;
  switch (d.kind) {
    case 'media': return `${d.media}: ${d.title}, ${ratingText(d.rating)}.${text ? ' ' + text : ''}${d.current ? ` (Currently ${DOING[d.media]})` : ''}`;
    case 'quote': return `“${text}” (${d.who === 'Overheard' ? 'overheard' : d.who === 'A book or film' ? 'from a book or film' : name(lk, d.who)}${d.where ? `, ${d.where}` : ''})`;
    case 'place': { const p = lk.places.get(d.placeId); return p ? `Place: ${p.name}${d.first ? ' (a first)' : ''}.${text ? ' ' + text : ''}` : 'Place: a place that was removed.'; }
    case 'person': return `${HOW[d.how]} ${list(d.who.map(i => name(lk, i)))}.${text ? ' ' + text : ''}`;
    case 'keep': return `Keepsake: ${text}.`;
    case 'voice': return `Voice note, ${Math.floor(d.seconds / 60)}:${String(Math.round(d.seconds % 60)).padStart(2, '0')}.${text ? ' ' + text : ''}`;
    case 'span': { const s = lk.spans.get(d.spanId); return s ? `Span: ${s.name}, ${range(s.from, s.to)}.` : 'Span: a span that was removed.'; }
    case 'past': return `Written later: ${text}`;
  }
}
```

- [ ] **Step 3: Implement `KeptCard.tsx`**

Port the per-kind markup of `keptCard` from `design/pinboard8-source/p7-screens.js`:
- The `line` kind uses Stage 1's `RichText` (tag chips open tag pages through `onOpenTag`, and feelings open the feeling card).
- Media shows the title in bold, a `.rating` pill with `ratingText`, and a `.rating` "Currently" pill.
- A quote is a `blockquote.qcard`.
- A place gives its name, plus a "first" `mpill` with the First icon when `first`.
- A person entry shows the `how` word, then a `PersonChip` for each initial.
- A keepsake shows its photo thumbnail when `photoId` has a URL (`photoUrl` prop), then its name.
- A voice note has an `<audio controls preload="none">` whose `src` is an object URL. Create it with `useMemo(() => URL.createObjectURL(blob), [blob])` and revoke it in an effect cleanup.
- A span shows a colour bar, its name and its dates (words, so the colour is never alone).
- Something from before shows its text and a hint, "Written later, on {writtenAt date}".

Every card ends with the time (`timeLabelIn`), the marks and the ⋯ menu button (`onMenu`).

Then `Today.tsx` and `DayPage.tsx` render `KeptCard` for every entry. Today's Kept list shows entries of every kind, and the day page weaves them into the story by time. `markdown.ts` writes `entryLine(e, lk)` for every entry. `dayToMarkdown` gains an optional last parameter, `lk: Lookup = { places: new Map(), spans: new Map(), people: new Map() }`, and `exportMarkdown.ts` builds it from the tables.

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src tests && git commit -m "feat: one readable line per entry kind, and kept cards for every kind"
```

---

### Task 4: Photos and the photo of the day

**Files:**
- Create: `src/domain/image.ts`, `src/db/photos.ts`
- Modify: `src/screens/Today.tsx` (the photos panel)
- Test: `tests/photos.test.ts`

**Interfaces:**
- Produces:
  - `fitSize(w: number, h: number, max: number): { w: number; h: number }`: keeps the aspect ratio, and never enlarges.
  - `resizeImage(file: Blob, max: number): Promise<Blob>`: browser only. `createImageBitmap(file, { imageOrientation: 'from-image' })`, an OffscreenCanvas (or a canvas), then `convertToBlob({ type: 'image/jpeg', quality: 0.85 })`.
  - `class NotAnImageError extends Error`
  - `addPhoto(db, file: Blob, at: Date, resize = resizeImage): Promise<{ photoId: number; undo: Undo }>`: refuses anything whose `type` doesn't start with `image/`. Stores a 1600 px version and a 320 px thumbnail. Makes it the photo of the day if the day has none.
  - `removePhoto(db, id): Promise<Undo>`: also clears it as photo of the day.

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { fitSize } from '../src/domain/image';
import { openDb, type LogbookDb } from '../src/db/db';
import { NotAnImageError, addPhoto, removePhoto } from '../src/db/photos';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('ph-' + n++); await db.open(); });
const fake = (size: number) => async (b: Blob, max: number) => new Blob([`${max}:${size}`], { type: 'image/jpeg' });
const at = new Date('2026-09-29T12:00:00');

describe('photo sizes', () => {
  it('fits the long edge to 1600 and never enlarges', () => {
    expect(fitSize(4000, 3000, 1600)).toEqual({ w: 1600, h: 1200 });
    expect(fitSize(3000, 4000, 1600)).toEqual({ w: 1200, h: 1600 });
    expect(fitSize(800, 600, 1600)).toEqual({ w: 800, h: 600 });
  });
});
describe('adding photos', () => {
  it('stores a resized photo and a thumbnail; the first becomes the photo of the day', async () => {
    const r = await addPhoto(db, new Blob(['x'], { type: 'image/png' }), at, fake(1));
    const p = await db.photos.get(r.photoId);
    expect(await p!.blob.text()).toBe('1600:1'); expect(await p!.thumb.text()).toBe('320:1');
    expect((await db.days.get('2026-09-29'))?.potd).toBe(r.photoId);
    const r2 = await addPhoto(db, new Blob(['y'], { type: 'image/jpeg' }), at, fake(2));
    expect((await db.days.get('2026-09-29'))?.potd).toBe(r.photoId);
    await r2.undo.run(); expect(await db.photos.count()).toBe(1);
  });
  it('refuses something that isn’t an image, and saves nothing', async () => {
    await expect(addPhoto(db, new Blob(['%PDF'], { type: 'application/pdf' }), at, fake(1))).rejects.toBeInstanceOf(NotAnImageError);
    expect(await db.photos.count()).toBe(0);
  });
  it('removing the photo of the day clears it, and Undo brings both back', async () => {
    const r = await addPhoto(db, new Blob(['x'], { type: 'image/png' }), at, fake(1));
    const u = await removePhoto(db, r.photoId);
    expect((await db.days.get('2026-09-29'))?.potd).toBeUndefined();
    await u.run(); expect((await db.days.get('2026-09-29'))?.potd).toBe(r.photoId);
  });
});
```

Run: `npx vitest run tests/photos.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement**

`src/domain/image.ts`:
```ts
export function fitSize(w: number, h: number, max: number) { const k = Math.min(1, max / Math.max(w, h)); return { w: Math.round(w * k), h: Math.round(h * k) }; }
/* Resize in the browser: respects the photo's own orientation, and always writes a JPEG. */
export async function resizeImage(file: Blob, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { w, h } = fitSize(bmp.width, bmp.height, max), c = new OffscreenCanvas(w, h), g = c.getContext('2d')!;
  g.drawImage(bmp, 0, 0, w, h); bmp.close();
  return c.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
```

`src/db/photos.ts`:
```ts
import type { LogbookDb } from './db';
import { dayKey } from '../domain/day';
import { resizeImage } from '../domain/image';
import { StorageFullError, type Undo } from './actions';

export class NotAnImageError extends Error { constructor() { super('That file isn’t a photo. Nothing was added.'); this.name = 'NotAnImageError'; } }
const once = (label: string, fn: () => Promise<unknown>): Undo => { let done = false; return { label, run: async () => { if (done) return; done = true; await fn(); } }; };
export async function addPhoto(db: LogbookDb, file: Blob, at: Date, resize: (b: Blob, max: number) => Promise<Blob> = resizeImage) {
  if (!file.type.startsWith('image/')) throw new NotAnImageError();
  const [blob, thumb] = [await resize(file, 1600), await resize(file, 320)], day = dayKey(at);
  try {
    return await db.transaction('rw', db.photos, db.days, async () => {
      const photoId = await db.photos.add({ day, blob, thumb, addedAt: Date.now() });
      const row = await db.days.get(day);
      if (!row?.potd) await db.days.put({ ...(row ?? { day }), potd: photoId });
      return { photoId, undo: once('Added a photo', () => db.transaction('rw', db.photos, db.days, async () => { await db.photos.delete(photoId); const r = await db.days.get(day); if (r?.potd === photoId) { const next = { ...r }; delete next.potd; await db.days.put(next); } })) };
    });
  } catch (e) { if ((e as { name?: string }).name === 'QuotaExceededError' || (e as { inner?: { name?: string } }).inner?.name === 'QuotaExceededError') throw new StorageFullError(); throw e; }
}
export async function removePhoto(db: LogbookDb, id: number): Promise<Undo> {
  const p = await db.photos.get(id); if (!p) return once('Nothing', async () => {});
  const row = await db.days.get(p.day);
  await db.transaction('rw', db.photos, db.days, async () => { await db.photos.delete(id); if (row?.potd === id) { const next = { ...row }; delete next.potd; await db.days.put(next); } });
  return once('Removed a photo', () => db.transaction('rw', db.photos, db.days, async () => { await db.photos.put(p); if (row) await db.days.put(row); }));
}
```

- [ ] **Step 3: The photos panel on Today**

Port the "Today’s photos" panel from `pToday` in `design/pinboard8-source/p7-screens.js`:
- **Thumbnails:** each is a 72 px button showing its thumbnail (object URLs, revoked when unmounted). Tapping one makes it the photo of the day (`setPhotoOfDay`, with Undo). The photo of the day shows a First-style star icon and has `aria-pressed="true"`.
- **Add from your phone:** a button opens a hidden `<input type="file" accept="image/*" multiple>`. Each file is added in turn. A `NotAnImageError` or `StorageFullError` shows its message through `undo.fail`, and the rest still add.
- **Long-press or ⋯ on a thumbnail:** opens a sheet with "Remove this photo" (with Undo).
- **Placement:** during the day the panel sits right under Kept today. At night it folds into "Today so far", with the summary reading "2 photos · grateful for".

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Check by hand**

Run `npm run dev` and add a large phone photo and a PNG screenshot. Expected: both appear, the first is the photo of the day, and a PDF gives the message "That file isn’t a photo. Nothing was added."

- [ ] **Step 6: Commit**

```bash
git add -A src tests && git commit -m "feat: photos, resized on the phone, with a photo of the day"
```

---

### Task 5: The + sheet, new routes and the Shelves tab

**Files:**
- Create: `src/screens/AddSheet.tsx`
- Modify: `src/router.ts`, `src/ui/Tabs.tsx`, `src/App.tsx`, `src/screens/Today.tsx` (the Search button in the header)
- Test: `tests/routes2.test.tsx`

**Interfaces:**
- Produces:
  - `Route` gains:
    - `{ name: 'add' }`
    - `{ name: 'form'; kind: FormKind }`, where `FormKind = 'photo' | 'media' | 'quote' | 'place' | 'person' | 'keep' | 'voice' | 'span' | 'past'`
    - `{ name: 'shelves' }`, `{ name: 'shelf'; shelf: ShelfId }`, `{ name: 'person'; id: string }`, `{ name: 'tag'; tag: string }`, `{ name: 'search' }`
  - The hashes are `#/add`, `#/form/media`, `#/shelves`, `#/shelf/firsts`, `#/person/a`, `#/tag/walk` and `#/search`.
  - `ShelfId = 'firsts' | 'media' | 'quotes' | 'places' | 'keeps' | 'bdays' | 'spans'`. Songs of the week arrives in Stage 3 with Last.fm.
  - `ADD_KINDS: [FormKind | 'feeling', string, string][]` (the label and a short note), copied from `ADDKINDS` in `design/pinboard8-source/p7-data2.js`.
  - `Tabs current: 'today' | 'cal' | 'shelves' | 'settings'`. The + button now goes to `#/add`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash, type Route } from '../src/router';
import { AddSheetView } from '../src/screens/AddSheet';
import { Tabs } from '../src/ui/Tabs';

describe('new routes', () => {
  it('round-trip', () => {
    const rs: Route[] = [{ name: 'add' }, { name: 'form', kind: 'media' }, { name: 'shelves' }, { name: 'shelf', shelf: 'places' }, { name: 'person', id: 'a' }, { name: 'tag', tag: 'walk' }, { name: 'search' }];
    for (const r of rs) expect(parseRoute(routeHash(r))).toEqual(r);
  });
  it('an unknown form or shelf goes to Today', () => { expect(parseRoute('#/form/rocket')).toEqual({ name: 'today' }); expect(parseRoute('#/shelf/rocket')).toEqual({ name: 'today' }); });
  it('tags with spaces or accents survive', () => expect(parseRoute(routeHash({ name: 'tag', tag: 'café' }))).toEqual({ name: 'tag', tag: 'café' }));
});
describe('the + sheet', () => {
  it('lists every kind, with Feeling as the big button at the bottom', () => {
    const html = renderToStaticMarkup(<AddSheetView />);
    for (const w of ['Photo', 'Film, book or show', 'Quote', 'Place', 'Person', 'Keepsake', 'Voice note', 'Span', 'Something from before']) expect(html).toContain(w);
    expect(html.lastIndexOf('Feeling')).toBeGreaterThan(html.lastIndexOf('Something from before'));
  });
  it('the tab bar has Shelves', () => expect(renderToStaticMarkup(<Tabs current="shelves" />)).toMatch(/aria-current="page"[^>]*>[^]*Shelves/));
});
```

Run: `npx vitest run tests/routes2.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

- **`router.ts`:** extend `parseRoute` and `routeHash` as in the interfaces. Encode tag names with `encodeURIComponent`, and check `form` and `shelf` against their lists.
- **`AddSheet.tsx`:** port `pAddSheet` from `p7-screens2.js`. `AddSheetView` renders the two-column `.addgrid` of the other kinds, each linking to `form:<kind>`. Below them come the hint "You can also type straight into today’s line…" and the big Feeling tile (`.addtile.feel`), which goes to `#/feel?when=now`.
- **`Tabs.tsx`:** the order is Today, Calendar, +, Shelves (the `shelves` icon), Settings.
- **`App.tsx`:** route the new screens. Until later tasks exist, use a stub per screen that shows its heading and a Back button.
- **`Today.tsx`:** add a Search icon button next to Settings in the header (`go({ name: 'search' })`).

- [ ] **Step 3: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A src tests && git commit -m "feat: the + sheet, a Shelves tab and routes for the new screens"
```

---

### Task 6: The drawn place map

**Files:**
- Create: `src/domain/geo.ts`, `src/draw/placeMap.ts`
- Test: `tests/placemap.test.ts`

**Interfaces:**
- Produces:
  - `roundCoord(x: number): number`: 3 decimals, about 100 m.
  - `projection(points: { lat: number; lon: number }[], w: number, h: number, pad: number): ((p: { lat: number; lon: number }) => { x: number; y: number }) | null`
    - It returns `null` when there are no points.
    - Everything fits inside the padding with the aspect ratio kept: longitude is scaled by `cos(midLat)`.
    - A single point, or points closer than about 2 km, get a minimum box of ±0.01° around their centre, so the map never zooms to infinity.
  - `drawPlaceMap(ctx, look, w, h, t, places: Place[], homes: { lat: number; lon: number }[])`: ports `drawPlaceMap` from `design/pinboard8-source/p7-scenes2.js`, keeping the style (soft contours, one river, a dashed path) and the seeded randomness `prng(77)`, now as a small local `prng`. Changes from the pinboard:
    - dots are placed with `projection` over all places that have coordinates, plus the homes;
    - places without coordinates are skipped;
    - dot size grows with `visits`, capped as before;
    - dots are neutral ink, and firsts get a glow and a twinkle in the First mark's colour (`look.pal.bright`);
    - homes are small house outlines, drawn as paths, with no names on the map.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { projection, roundCoord } from '../src/domain/geo';
import { drawPlaceMap } from '../src/draw/placeMap';
import { lookOf } from '../src/draw/forms';

describe('geo', () => {
  it('rounds to about 100 m', () => expect(roundCoord(28.613939)).toBe(28.614));
  it('keeps every point inside the padding', () => {
    const pts = [{ lat: 10, lon: 20 }, { lat: 10.05, lon: 20.1 }, { lat: 9.98, lon: 19.95 }];
    const P = projection(pts, 300, 200, 20)!;
    for (const p of pts) { const q = P(p); expect(q.x).toBeGreaterThanOrEqual(20); expect(q.x).toBeLessThanOrEqual(280); expect(q.y).toBeGreaterThanOrEqual(20); expect(q.y).toBeLessThanOrEqual(180); }
  });
  it('north is up', () => { const P = projection([{ lat: 10, lon: 20 }, { lat: 10.1, lon: 20 }], 200, 200, 10)!; expect(P({ lat: 10.1, lon: 20 }).y).toBeLessThan(P({ lat: 10, lon: 20 }).y); });
  it('one point sits in the middle; no points means no projection', () => {
    const q = projection([{ lat: 10, lon: 20 }], 200, 100, 10)!({ lat: 10, lon: 20 }); expect(Math.round(q.x)).toBe(100); expect(Math.round(q.y)).toBe(50);
    expect(projection([], 200, 100, 10)).toBeNull();
  });
});
describe('the drawn map', () => {
  it('draws with places without positions, and with nothing at all, without errors', () => {
    const calls: string[] = []; const ctx = new Proxy({}, { get: (_, k) => (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop() {} }) : (...a: number[]) => { if (a.some(v => typeof v === 'number' && !Number.isFinite(v))) throw new Error('bad ' + String(k)); calls.push(String(k)); }, set: () => true }) as unknown as CanvasRenderingContext2D;
    drawPlaceMap(ctx, lookOf('dark'), 320, 240, 1, [{ id: 1, name: 'a', first: true, visits: 3, lat: 10, lon: 20 }, { id: 2, name: 'no position', first: false, visits: 1 }], [{ lat: 10.01, lon: 20.01 }]);
    drawPlaceMap(ctx, lookOf('light'), 320, 240, 1, [], []);
    expect(calls.length).toBeGreaterThan(0);
  });
});
```

Run: `npx vitest run tests/placemap.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement `geo.ts`**

```ts
export const roundCoord = (x: number) => Math.round(x * 1000) / 1000;
/* A simple, honest projection for a small area: longitude scaled by the cosine of the middle latitude, north up. */
export function projection(points: { lat: number; lon: number }[], w: number, h: number, pad: number) {
  if (!points.length) return null;
  let [s, n, west, east] = [Math.min(...points.map(p => p.lat)), Math.max(...points.map(p => p.lat)), Math.min(...points.map(p => p.lon)), Math.max(...points.map(p => p.lon))];
  const midLat = (s + n) / 2, k = Math.cos(midLat * Math.PI / 180), minSpan = 0.01;
  if (n - s < minSpan * 2) { const c = (s + n) / 2; s = c - minSpan; n = c + minSpan; }
  if ((east - west) * k < minSpan * 2) { const c = (west + east) / 2; west = c - minSpan / k; east = c + minSpan / k; }
  const spanX = (east - west) * k, spanY = n - s, scale = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
  const offX = (w - spanX * scale) / 2, offY = (h - spanY * scale) / 2;
  return (p: { lat: number; lon: number }) => ({ x: offX + (p.lon - west) * k * scale, y: offY + (n - p.lat) * scale });
}
```

- [ ] **Step 3: Implement `placeMap.ts`**

Port as described in the interfaces. The background is `look.theme === 'dark' ? '#121A22' : '#EEF1EC'`. The contour and river code is unchanged apart from `rgba`/`look`. For each placed dot: `const r = 4 + Math.min(4, visits / 6)`; neutral fill `look.ground.ink` at 0.85 alpha; for firsts, `glow(..., look.pal.bright, 0.6)` plus a twinkle. The house outline for each home:
```ts
ctx.beginPath(); ctx.moveTo(x - 7, y + 5); ctx.lineTo(x - 7, y - 2); ctx.lineTo(x, y - 8); ctx.lineTo(x + 7, y - 2); ctx.lineTo(x + 7, y + 5); ctx.closePath(); ctx.stroke();
```

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src tests && git commit -m "feat: Logbook's own drawn map of places, homes and firsts"
```

---

### Task 7: The forms for film, quote, place, person, keepsake, span and something from before

**Files:**
- Create: `src/screens/forms/Form.tsx` (the shared frame), `MediaForm.tsx`, `QuoteForm.tsx`, `PlaceForm.tsx`, `PersonForm.tsx`, `KeepForm.tsx`, `SpanForm.tsx`, `PastForm.tsx`, `PhotoForm.tsx`, `index.tsx`
- Test: `tests/forms.test.tsx`

**Interfaces:**
- Consumes: `keepEntry`, `addPlace`, `addSpan` (Task 2); `addPhoto` (Task 4); `drawPlaceMap`, `roundCoord` (Task 6); `RATINGS`; `Sheet`, `useUndo`, `go`.
- Produces:
  - `FormFrame({ title, children, keepLabel, disabled, onKeep })`: a back button, the heading, a scroll panel, and a pinned `.pinbar` Keep button that names what it keeps (`Keep this film`).
  - Each form has a pure `…FormView(props)` and a container. After keeping, the container returns to Today with a carried Undo notice (`undo.show(u, 'Kept in today.', { carry: true })`).
  - `validPastDate(d: string, today: string): string | null`: returns the error text or `null`. Future dates are refused; dates before 1940 are allowed.
  - `PlaceFormView` shows "Use where I am" only when `navigator.geolocation` exists. The position is rounded with `roundCoord`, and a mini map (`<Scene draw={drawPlaceMap…}>`, 180 px) shows the new dot among the other places. "This is a first" is a real checkbox label of at least 44 px.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MediaFormView, QuoteFormView, PlaceFormView, PersonFormView, SpanFormView, PastFormView, validPastDate } from '../src/screens/forms';

const noop = () => {};
describe('forms', () => {
  it('film: the 1–7 buttons are neutral with their words, and Keep names the kind', () => {
    const html = renderToStaticMarkup(<MediaFormView media="Film" title="Past Lives" rating={6} current={false} note="" onChange={noop} onKeep={noop} />);
    expect(html).toContain('6 of 7 · Exceptional'); expect(html).toContain('Keep this film'); expect(html).not.toMatch(/--fc/);
  });
  it('film: Keep waits for a title', () => expect(renderToStaticMarkup(<MediaFormView media="Book" title="" rating={4} current={false} note="" onChange={noop} onKeep={noop} />)).toMatch(/disabled=""[^>]*>[^]*Keep this book/));
  it('quote: who said it, including Overheard', () => expect(renderToStaticMarkup(<QuoteFormView text="x" who="Overheard" where="" people={[{ id: 'a', initial: 'A', name: 'Friend A', thread: 0 }]} onChange={noop} onKeep={noop} />)).toContain('Friend A'));
  it('place: works without a position, and says the map needs one', () => {
    const html = renderToStaticMarkup(<PlaceFormView name="A new café" first={true} pos={null} canLocate={true} places={[]} homes={[]} onChange={noop} onLocate={noop} onKeep={noop} />);
    expect(html).toContain('Use where I am'); expect(html).toContain('It shows on your map once it has a position');
  });
  it('person: faces carry their thread colour, and How is a real choice', () => {
    const html = renderToStaticMarkup(<PersonFormView who={['A']} how="Call" people={[{ id: 'a', initial: 'A', name: 'Friend A', thread: 2 }]} onChange={noop} onKeep={noop} />);
    expect(html).toMatch(/aria-pressed="true"[^>]*>A/); expect(html).toMatch(/aria-pressed="true"[^>]*>Call/);
  });
  it('span: colour swatches are labelled with their family', () => expect(renderToStaticMarkup(<SpanFormView name="Diwali" from="2026-11-06" to="2026-11-10" family="warm" error="" onChange={noop} onKeep={noop} />)).toContain('Warm'));
  it('something from before: refuses the future, allows the old', () => {
    expect(validPastDate('2027-01-01', '2026-09-29')).toMatch(/future/);
    expect(validPastDate('1935-05-01', '2026-09-29')).toBeNull();
    expect(renderToStaticMarkup(<PastFormView date="2022-06-14" text="Graduation" error="" today="2026-09-29" onChange={noop} onKeep={noop} />)).toContain('written later');
  });
});
```

Run: `npx vitest run tests/forms.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

Port each form's markup from `pForm` in `design/pinboard8-source/p7-screens2.js`, React-ised, with the round-8 sizes and the Global Constraints:
- **Media:** kind chips (Film, Series, Book, Game, Album, Other), a Title field, a one-line note, seven neutral `.sewbtn` buttons (`aria-label="6, Exceptional"`), the words of the chosen rating, and a "Pin to Currently" checkbox. Keep is disabled until there's a title. It keeps `{ kind: 'media', media, title, rating, current }`, with the note as `text`.
- **Quote:** a textarea for the words; who said it, as chips for each starter person plus Overheard and A book or film; and "Where (optional)".
- **Place:**
  - a name field, "This is a first", and "Use where I am";
  - on tap: `navigator.geolocation.getCurrentPosition(p => setPos({ lat: roundCoord(p.coords.latitude), lon: roundCoord(p.coords.longitude) }), () => setError('Logbook couldn’t get your position. You can still keep the place.'), { maximumAge: 60_000, timeout: 15_000 })`;
  - Keep calls `addPlace`, then `keepEntry` with `{ kind: 'place', placeId, first }`;
  - when `pos` is null, the hint says "It shows on your map once it has a position.".
- **Person:** faces from the starter file as toggle buttons (`aria-pressed`), How chips (In person, Call, Messages), and the hint "Calls and messages count as time together."
- **Keepsake:** "Add a photo of it" (the file input goes through `addPhoto`; its id becomes `photoId`), and "What is it?". Keep needs the name.
- **Span:** name, from and to date inputs, and a labelled family swatch grid (the same `.swatch` with the family name as text). An `addSpan` error shows in `role="alert"`. A span keeps both a `spans` row and an entry `{ kind: 'span', spanId }` on the day it was written.
- **Something from before:** a date input (`max` = today), a textarea, and the hint "It gets a “written later” stamp. Logbook fills in that day’s weather later." (the weather comes in 2b). Keep is disabled while `validPastDate` returns an error, which is shown.
- **Photo:** "Choose from your phone" (multiple), which adds each one and returns to Today.

`index.tsx` exports every `…FormView`, `validPastDate`, and `FormScreen({ kind })`, which picks the container. `App` routes `{ name: 'form' }` to `FormScreen`.

```ts
export function validPastDate(d: string, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return 'Choose a date.';
  if (d > today) return 'That date is in the future. Something from before needs a past date.';
  return null;
}
```

- [ ] **Step 3: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A src tests && git commit -m "feat: forms for film, quote, place, person, keepsake, span, something from before and photos"
```

---

### Task 8: Voice notes

**Files:**
- Create: `src/screens/forms/VoiceForm.tsx`, `src/domain/recorder.ts`
- Test: `tests/voice.test.tsx`

**Interfaces:**
- Produces:
  - `recorderSupport(): 'ok' | 'unsupported'`: checks for `navigator.mediaDevices?.getUserMedia` and `MediaRecorder`.
  - `pickMime(isSupported: (t: string) => boolean): string`: tries `audio/webm;codecs=opus`, `audio/webm` and `audio/mp4` in order, and falls back to `''`.
  - `VoiceFormView({ state: 'idle' | 'recording' | 'recorded' | 'denied' | 'unsupported'; seconds: number; onStart; onStop; onDiscard; onKeep })`
  - The container records at most 5 minutes, stops the stream's tracks when it finishes or leaves, keeps `{ kind: 'voice', audio, seconds, type }`, and never keeps anything when the microphone was refused.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { pickMime, recorderSupport } from '../src/domain/recorder';
import { VoiceFormView } from '../src/screens/forms/VoiceForm';

const noop = () => {};
describe('voice notes', () => {
  it('picks the first recording format the phone supports', () => {
    expect(pickMime(t => t === 'audio/webm')).toBe('audio/webm');
    expect(pickMime(() => false)).toBe('');
  });
  it('reports unsupported where there is no recorder (like this test runner)', () => expect(recorderSupport()).toBe('unsupported'));
  it('says so plainly when the microphone is refused, and offers nothing to keep', () => {
    const html = renderToStaticMarkup(<VoiceFormView state="denied" seconds={0} onStart={noop} onStop={noop} onDiscard={noop} onKeep={noop} />);
    expect(html).toContain('Logbook wasn’t allowed to use the microphone'); expect(html).not.toContain('Keep this voice note');
  });
  it('after recording shows the length and Keep', () => expect(renderToStaticMarkup(<VoiceFormView state="recorded" seconds={42} onStart={noop} onStop={noop} onDiscard={noop} onKeep={noop} />)).toMatch(/0:42[^]*Keep this voice note/));
});
```

Run: `npx vitest run tests/voice.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

`src/domain/recorder.ts`:
```ts
export const recorderSupport = () => (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined' ? 'ok' : 'unsupported') as 'ok' | 'unsupported';
export const pickMime = (isSupported: (t: string) => boolean) => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(isSupported) ?? '';
```

`VoiceFormView` ports the `voice` branch of `pForm`: the large mic button (`.micbtn`, 104 px) to start, a Stop button with a running `m:ss` while recording, and Discard / "Keep this voice note" after. The messages for each state:
- denied: "Logbook wasn’t allowed to use the microphone. You can allow it in the browser’s site settings, or write a line instead."
- unsupported: "This browser can’t record here. You can write a line instead."

The container uses `getUserMedia({ audio: true })` on Start. It catches `NotAllowedError` and sets `'denied'`. It builds a `MediaRecorder` with `pickMime(t => MediaRecorder.isTypeSupported(t))`, collects chunks, stops after 300 s, and stops all tracks on Stop, on Discard and on unmount.

- [ ] **Step 3: Run tests, then check by hand on the phone**

Run: `npm test && npm run typecheck`. Expected: PASS.

By hand, with `npm run dev` on the laptop and `npm run preview` over the phone's Wi-Fi: record 5 seconds, Keep, and play it back from Today's card. Then refuse the microphone and check the message.

- [ ] **Step 4: Commit**

```bash
git add -A src tests && git commit -m "feat: voice notes, kept on the phone, with plain messages when recording isn't possible"
```

---

### Task 9: Export and backup with photos and voice notes

**Files:**
- Modify: `src/db/exportMarkdown.ts`, `src/db/backup.ts`, `src/domain/markdown.ts`
- Test: `tests/export2.test.ts`

**Interfaces:**
- Produces:
  - The zip holds:
    - `YYYY/MM/YYYY-MM-DD.md`;
    - `photos/YYYY/MM/YYYY-MM-DD-<n>.jpg`, where `n` counts from 1 in adding order per day;
    - `audio/YYYY/MM/YYYY-MM-DD-<entryId>.<webm|m4a>`.
  - Markdown links to them relatively: `![Photo](../../photos/2026/09/2026-09-29-1.jpg)` and `[Voice note, 0:42](../../audio/2026/09/2026-09-29-12.webm)`. The photo of the day is listed first, and marked `(photo of the day)`.
  - The backup includes the `photos` table and voice blobs, each Blob written as `{ __blob: true, type, base64 }` and turned back into a Blob on restore.

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepEntry } from '../src/db/actions';
import { addPhoto } from '../src/db/photos';
import { makeMarkdownZip } from '../src/db/exportMarkdown';
import { makeBackup, restoreBackup } from '../src/db/backup';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('ex2-' + n++); await db.open(); });
const at = new Date('2026-09-29T20:00:00');
const img = async (b: Blob, max: number) => new Blob([`jpeg-${max}`], { type: 'image/jpeg' });

describe('export with files', () => {
  it('puts photos and voice notes in folders and links them from the day', async () => {
    await addPhoto(db, new Blob(['x'], { type: 'image/png' }), at, img);
    const v = await keepEntry(db, { kind: 'voice', text: '', data: { kind: 'voice', audio: new Blob(['sound'], { type: 'audio/webm' }), seconds: 42, type: 'audio/webm' }, at });
    const text = new TextDecoder().decode(new Uint8Array(await (await makeMarkdownZip(db)).arrayBuffer()));
    expect(text).toContain('photos/2026/09/2026-09-29-1.jpg');
    expect(text).toContain('![Photo](../../photos/2026/09/2026-09-29-1.jpg) (photo of the day)');
    expect(text).toContain(`audio/2026/09/2026-09-29-${v.entryId}.webm`);
    expect(text).toContain('jpeg-1600'); expect(text).toContain('sound');
  });
});
describe('backup with files', () => {
  it('round-trips photos and voice notes byte for byte', async () => {
    await addPhoto(db, new Blob(['x'], { type: 'image/png' }), at, img);
    await keepEntry(db, { kind: 'voice', text: '', data: { kind: 'voice', audio: new Blob(['sound'], { type: 'audio/webm' }), seconds: 1, type: 'audio/webm' }, at });
    const json = JSON.parse(JSON.stringify(await makeBackup(db)));
    const other = openDb('ex2-r-' + n++); await other.open(); await restoreBackup(other, json);
    expect(await (await other.photos.toArray())[0].blob.text()).toBe('jpeg-1600');
    const v = (await other.entries.toArray()).find(e => e.kind === 'voice')!;
    expect(v.data?.kind === 'voice' && await v.data.audio.text()).toBe('sound');
  });
});
```

Run: `npx vitest run tests/export2.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement**

In `backup.ts`, add `'photos'` to `TABLES` and walk every row:
```ts
async function pack(v: unknown): Promise<unknown> {
  if (v instanceof Blob) { const b = new Uint8Array(await v.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return { __blob: true, type: v.type, base64: btoa(s) }; }
  if (Array.isArray(v)) return Promise.all(v.map(pack));
  if (v && typeof v === 'object') return Object.fromEntries(await Promise.all(Object.entries(v).map(async ([k, x]) => [k, await pack(x)])));
  return v;
}
function unpack(v: unknown): unknown {
  if (v && typeof v === 'object' && (v as { __blob?: boolean }).__blob) { const { type, base64 } = v as { type: string; base64: string }; const s = atob(base64), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new Blob([b], { type }); }
  if (Array.isArray(v)) return v.map(unpack);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unpack(x)]));
  return v;
}
```
`makeBackup` packs each table, and `restoreBackup` unpacks before `bulkPut`.

In `exportMarkdown.ts`, add the photo and audio files (`new Uint8Array(await blob.arrayBuffer())`) and pass `dayToMarkdown` an extra `files` parameter, `{ photos: { path: string; potd: boolean }[]; audio: Map<number, string> }`, so it can write the links. In `markdown.ts`, after the entries, add a `## Photos` section when the day has photos; voice notes link from their own entry line.

- [ ] **Step 3: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A src tests && git commit -m "feat: the export and the backup carry photos and voice notes"
```

---

### Task 10: Shelves

**Files:**
- Create: `src/screens/Shelves.tsx`
- Test: `tests/shelves.test.tsx`

**Interfaces:**
- Consumes: `entryLine`, `KeptCard`, `drawPlaceMap`, the tables.
- Produces:
  - `ShelvesView({ counts: Record<ShelfId, string>; people: Person[]; tags: { name: string; family: Family }[] })`: ports `pShelves`. It shows the shelf tiles, then People (static faces with thread rings, linking to `person:<id>`), then Tags (`TagChip`s linking to `tag:<name>`, with the hint "A tag’s colour is the feeling it most often comes with.").
  - `ShelfView({ shelf, entries, lookup, photos, places, homes, people, spans })`: ports `pShelf` for:
    - `firsts`: every entry marked First, newest first;
    - `media`: Currently first, then every media entry with its rating pill;
    - `quotes`;
    - `places`: the big drawn map (250 px), then the list with visit counts and the first mark, including places without a position, noted "no position yet";
    - `keeps`: keepsake photos in a grid;
    - `bdays`: people with a birthday from the starter file, soonest first, with "in N days" and any entries marked Gift that involve them;
    - `spans`: every span with its colour bar, name and dates.
  - `shelfCounts(entries, places, people, spans, today): Record<ShelfId, string>`: pure, giving the tile subtitles (e.g. `'21 this year'`, `'1 on the go'`, `'38, of them 21 firsts'`, `'Friend A’s in 12 days'`).
  - Empty shelves say what goes there, e.g. "Firsts appear here when you mark something First."

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShelfView, shelfCounts } from '../src/screens/Shelves';

const lk = { places: new Map(), spans: new Map(), people: new Map() };
const e = (x: object) => ({ id: 1, day: '2026-09-21', at: 0, tz: 'UTC', kind: 'line', text: 'the best chai', marks: {}, tags: [], people: [], writtenAt: 0, ...x });
describe('shelves', () => {
  it('counts firsts this year and what is on the go', () => {
    const c = shelfCounts([e({ marks: { first: true } }), e({ kind: 'media', data: { kind: 'media', media: 'Book', title: 'X', rating: 5, current: true } })] as never, [], [], [], '2026-09-29');
    expect(c.firsts).toBe('1 this year'); expect(c.media).toBe('1 on the go');
  });
  it('an empty shelf says what goes there', () => expect(renderToStaticMarkup(<ShelfView shelf="firsts" entries={[]} lookup={lk} photos={[]} places={[]} homes={[]} people={[]} spans={[]} />)).toContain('Firsts appear here when you mark something First'));
  it('birthdays count down from today', () => {
    const html = renderToStaticMarkup(<ShelfView shelf="bdays" entries={[]} lookup={lk} photos={[]} places={[]} homes={[]} spans={[]} people={[{ id: 'a', initial: 'A', name: 'Friend A', thread: 0, birthday: '10-11' }]} today="2026-09-29" />);
    expect(html).toContain('Friend A'); expect(html).toContain('in 12 days');
  });
  it('places without a position are still listed', () => expect(renderToStaticMarkup(<ShelfView shelf="places" entries={[]} lookup={lk} photos={[]} homes={[]} people={[]} spans={[]} places={[{ id: 1, name: 'Somewhere', first: false, visits: 2 }]} />)).toContain('no position yet'));
});
```

Run: `npx vitest run tests/shelves.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

This is a port as described. `ShelfView` takes an optional `today` prop (default `dayKey(new Date())`). Birthdays are `MM-DD`: the next occurrence on or after `today`, and "today!" when it's today. The `Shelves` and `Shelf` containers load their tables with `useLiveQuery` and use `Tabs current="shelves"`.

- [ ] **Step 3: Run tests, then commit**

Run: `npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: shelves (firsts, films and books, quotes, places on the drawn map, keepsakes, birthdays, spans)"
```

---

### Task 11: Person pages and tag pages

**Files:**
- Create: `src/domain/people.ts`, `src/screens/Person.tsx`, `src/screens/TagPage.tsx`
- Modify: `src/screens/Today.tsx`, `src/screens/DayPage.tsx` and `KeptCard.tsx` (tag chips open tag pages; @ chips open person pages; day-page feelings open the card)
- Test: `tests/person.test.tsx`

**Interfaces:**
- Produces:
  - `togetherStats(initial: string, entries: Entry[], year: number): { days: number; last?: string; byMonth: number[] }`: the days in `year` with any entry naming the person (a line with @, or a person entry), the last such day, and the counts for each of the 12 months.
  - `PersonView({ person, stats, entries, lookup, onThread })`: ports `pPerson`, following the round-7 wording rules:
    - "Together N days this year", "Last together on 28 September", and "Birthday on 11 October" when known;
    - never "last seen N days ago" or "usually low";
    - a "Their colour" row with **Change**, which cycles `PERSON_THREADS` through `setPersonThread`;
    - month bars in neutral ink, with `role="img"` and an `aria-label` listing the counts;
    - All / Events / Feelings filter chips, then the entries.
  - `TagView({ tag, family, fromHistory: boolean, entries, lookup, month: string })`: ports `pTag`. It shows the count, the colour explanation ("Its colour is warm, the feeling it most often comes with." or "…today’s feeling, until it has a history."), a 30-day strip for the month with `aria-label` listing the days, and the entries.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { togetherStats } from '../src/domain/people';
import { PersonView } from '../src/screens/Person';
import { TagView } from '../src/screens/TagPage';

const e = (day: string, x: object) => ({ id: Math.random(), day, at: 0, tz: 'UTC', kind: 'line', text: '', marks: {}, tags: [], people: [], writtenAt: 0, ...x });
const lk = { places: new Map(), spans: new Map(), people: new Map() };
describe('time together', () => {
  it('counts days, not entries, and finds the last one', () => {
    const s = togetherStats('R', [e('2026-09-14', { people: ['R'] }), e('2026-09-14', { kind: 'person', people: ['R'] }), e('2026-08-02', { people: ['R'] }), e('2025-12-01', { people: ['R'] })] as never, 2026);
    expect(s.days).toBe(2); expect(s.last).toBe('2026-09-14'); expect(s.byMonth[8]).toBe(1);
  });
});
describe('person page', () => {
  it('describes time together and never judges', () => {
    const html = renderToStaticMarkup(<PersonView person={{ id: 'r', initial: 'R', name: 'Friend R', thread: 1, birthday: '08-21' }} stats={{ days: 12, last: '2026-09-14', byMonth: Array(12).fill(1) }} entries={[]} lookup={lk} onThread={() => {}} />);
    expect(html).toContain('Together 12 days this year'); expect(html).toContain('Last together on 14 September'); expect(html).toContain('Birthday on 21 August');
    expect(html).not.toMatch(/usually|days ago/);
  });
});
describe('tag page', () => {
  it('explains where the colour comes from', () => expect(renderToStaticMarkup(<TagView tag="walk" family="warm" fromHistory={true} entries={[]} lookup={lk} month="2026-09" />)).toContain('the feeling it most often comes with'));
});
```

Run: `npx vitest run tests/person.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement, then wire the chips**

`people.ts`:
```ts
import type { Entry } from '../db/types';
export function togetherStats(initial: string, entries: Entry[], year: number) {
  const days = [...new Set(entries.filter(e => e.people.includes(initial) && e.day.startsWith(String(year))).map(e => e.day))].sort();
  const byMonth = Array(12).fill(0) as number[]; days.forEach(d => byMonth[Number(d.slice(5, 7)) - 1]++);
  return { days: days.length, last: days[days.length - 1], byMonth };
}
```

Then wire the chips: every `TagChip` in `RichText` gets `onOpen={() => go({ name: 'tag', tag })}`; person mentions become buttons to `person:<id>`, found by initial; and day-page feeling chips open `FeelingCard` with `{ kind: 'entry', id }`.

- [ ] **Step 3: Run tests, then commit**

Run: `npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: person pages that describe time together, and tag pages; chips now open them"
```

---

### Task 12: Search

**Files:**
- Create: `src/domain/search.ts`, `src/screens/Search.tsx`
- Test: `tests/search.test.tsx`

**Interfaces:**
- Produces:
  - `searchAll(q: string, d: { entries: Entry[]; tags: string[]; people: Person[]; own: Record<string, Family>; lookup: Lookup }): { lines: { day: string; text: string; id: number }[]; tags: string[]; people: Person[]; feelings: Match[] }`
    - It matches case-insensitively on `entryLine` text, so every kind is searchable.
    - `#x` searches tags only, and `@x` searches people only by initial or name.
    - Results are newest first, capped at 20 lines, 8 tags, 8 people and 6 feelings.
    - An empty query gives empty results.
  - `SearchView({ q, results, onQ })`: ports `pSearch`. The input has `aria-label="Search"`, results sit in an `aria-live="polite"` region, lines show their date and open that day, and feelings open the feeling card (`kind: 'none'`). No match says: "Nothing matches “x” yet."

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { searchAll } from '../src/domain/search';

const lk = { places: new Map(), spans: new Map(), people: new Map() };
const e = (id: number, day: string, text: string, x: object = {}) => ({ id, day, at: id, tz: 'UTC', kind: 'line', text, marks: {}, tags: [], people: [], writtenAt: 0, ...x });
const d = { entries: [e(1, '2026-09-01', 'first #rain on the metro'), e(2, '2026-09-21', 'best chai of my life', {}), e(3, '2026-09-27', '', { kind: 'media', data: { kind: 'media', media: 'Film', title: 'Past Lives', rating: 6, current: false } })] as never,
  tags: ['rain', 'chai', 'metro'], people: [{ id: 'r', initial: 'R', name: 'Friend R', thread: 1 }], own: {}, lookup: lk };
describe('search', () => {
  it('finds lines of every kind, newest first', () => {
    expect(searchAll('past lives', d).lines.map(l => l.id)).toEqual([3]);
    expect(searchAll('the', d).lines.map(l => l.id)).toEqual([1]);
  });
  it('#x looks at tags only, @x at people only', () => {
    expect(searchAll('#ch', d)).toMatchObject({ tags: ['chai'], lines: [], people: [] });
    expect(searchAll('@r', d).people.map(p => p.name)).toEqual(['Friend R']);
  });
  it('feelings come from the whole vocabulary', () => expect(searchAll('pooped', d).feelings[0].w).toBe('pooped'));
  it('nothing for an empty query', () => expect(searchAll('  ', d)).toEqual({ lines: [], tags: [], people: [], feelings: [] }));
});
```

Run: `npx vitest run tests/search.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

```ts
import type { Entry, Person } from '../db/types';
import { entryLine, type Lookup } from './entryText';
import { searchFeelings, type Family, type Match } from '../vocab/vocab';
export function searchAll(q: string, d: { entries: Entry[]; tags: string[]; people: Person[]; own: Record<string, Family>; lookup: Lookup }) {
  const s = q.trim().toLowerCase(), none = { lines: [], tags: [], people: [], feelings: [] as Match[] };
  if (!s) return none;
  if (s.startsWith('#')) return { ...none, tags: d.tags.filter(t => t.includes(s.slice(1))).slice(0, 8) };
  if (s.startsWith('@')) { const p = s.slice(1); return { ...none, people: d.people.filter(x => x.initial.toLowerCase() === p || x.name.toLowerCase().includes(p)).slice(0, 8) }; }
  const lines = d.entries.map(e => ({ day: e.day, id: e.id!, text: entryLine(e, d.lookup), at: e.at })).filter(l => l.text.toLowerCase().includes(s)).sort((a, b) => b.at - a.at).slice(0, 20).map(({ day, id, text }) => ({ day, id, text }));
  return { lines, tags: d.tags.filter(t => t.includes(s)).slice(0, 8), people: d.people.filter(x => x.name.toLowerCase().includes(s)).slice(0, 8), feelings: searchFeelings(s, d.own, 6) };
}
```

`Search.tsx` is the container plus `SearchView`, ported from `pSearch`.

- [ ] **Step 3: Run tests, then commit**

Run: `npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: search across every kind of entry, tags, people and feelings"
```

---

### Task 13: Spans on the calendar, and the whole-app check

**Files:**
- Modify: `src/screens/Calendar.tsx` (span bands + list), `tests/screens.test.tsx` (add the new views)
- Test: `tests/calendar-spans.test.tsx`

**Interfaces:**
- Produces:
  - `CalendarView` gains `spans: Span[]`.
  - A day inside a span gets `.inspan` with `--sc` set to the span's colour.
  - Its `aria-label` ends with `, part of <span name>`.
  - Below the grid, each span in the month is listed with its colour bar, name and dates, so the colour is never alone.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarView } from '../src/screens/Calendar';
describe('spans on the calendar', () => {
  it('marks the days and names the span in words', () => {
    const html = renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" days={{ '2026-09-18': { family: 'curious', count: 2, first: false } }} spans={[{ id: 1, name: 'Trip', from: '2026-09-17', to: '2026-09-21', family: 'curious' }]} open={null} onOpen={() => {}} onMonth={() => {}} />);
    expect(html).toContain('part of Trip'); expect(html).toContain('Trip, 17 to 21 September');
  });
});
```

Run: `npx vitest run tests/calendar-spans.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement, extend the screens test, run everything**

Add the spans to `CalendarView` and the container (load `db.spans` overlapping the month). Add the new views (AddSheet, every form, Shelves and each shelf, Person, Tag, Search) to `tests/screens.test.tsx`, each rendered with empty and example data and checked for `undefined`/`NaN`.

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 3: The probe and the walk-through**

Run the checks in `scripts/probe.md` on every new screen at 100% and 150% text. Expected: `small` and `tiny` empty, and `over` false. Then walk the path by hand:
1. Add a photo and make it the photo of the day.
2. Keep a film rated 6 with Currently.
3. Keep a place with "Use where I am", and one without.
4. Keep a person call, a keepsake with a photo, a span, and something from before.
5. Check Shelves: the places map shows the one dot and lists both places.
6. Open a person page and a tag page.
7. Search for a film title.
8. Export, and open the zip: the day's Markdown links its photo and the photo opens.
9. Save a backup, restore it into a fresh browser profile, and check the photo, the voice note and the places are back.

- [ ] **Step 4: Commit and hand over**

```bash
git add -A src tests && git commit -m "feat: spans on the calendar; Stage 2a complete"
```

Don't merge or push. Tell the owner Stage 2a is ready and ask how to finish the branch.
