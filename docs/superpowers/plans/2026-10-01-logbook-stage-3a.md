# Logbook Stage 3a (The Almanac, looking back, sharing in, the laptop) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything in the spec's Stage 3 that needs no accounts:
- **The Almanac** replaces Settings in the tab bar (Settings stays in Today's header). It has four tabs:
  - **Report:** the year described in numbers and "Notable" things.
  - **Headlines:** this week in a line, and the year in twelve lines.
  - **Wrapped:** the month as cards that save as pictures.
  - **A random day:** with then-and-now.
- **On this day** appears on Today, and **echoes** on the day page.
- **Sharing in:** a link, a video or some text shared from another app opens a sheet to keep it as watched, as a link, or as a quote.
- **The laptop reading room:** a three-column layout at 1024 px and wider, with keyboard keys.

The Stage 2c leftovers are closed first. The connected parts (Drive, Last.fm, Health postcards, Timeline, Photos) are Stage 3b.

**Architecture:**
- The numbers and sentences are pure functions in `src/domain/almanac.ts`, built on `looking.ts` and tested directly.
- The Almanac is one screen with a tab in the route (`#/almanac?tab=headlines`).
- Wrapped cards are drawn on a canvas by `src/draw/cards.ts`, so the same drawing is shown and saved as a PNG.
- Sharing in uses the manifest's `share_target` (GET) pointing at the app's start URL. On load, `src/share.ts` reads `title`, `text` and `url` from `location.search`, clears them with `history.replaceState`, and opens `#/share`.
- The laptop layout is `src/screens/Desk.tsx`. It's used for Today and day pages when `matchMedia('(min-width: 1024px)')` matches. Its keys live in `src/ui/keys.ts`.

**Tech Stack:** unchanged. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-30-logbook-design.md`:
- section 6: "Don't bring back" entries are left out of On this day, Random day, Echoes and Wrapped;
- section 7: the Almanac, the day page's echoes, sharing in, and the laptop;
- section 15: Stage 3.

The approved look is in `design/pinboard8-source/`:
- `p7-screens2.js:150–182`: `reportContent`, `almBody` and `pAlmanac`;
- `p7-screens.js:82`: On this day;
- `p7-screens.js:226`: the echo;
- `p7-demos.js:42–82`: `shareMock` and `laptopMock`;
- `p7-phone.css`: `.mast`, `.headline`, `.rep-*`, `.records`, `.rec`, `.hline`, `.wrapped`, `.wcard`, `.rrow`, `.thennow`, `.echo`, `.sharesheet`, `.linkcard`, and the laptop's `.lp-*` rules in `p7-board.css`.

## Global Constraints

- Everything in Stages 1–2c still holds: no personal data in the repo, colour never alone, 44 px targets, 13 px minimum text, Undo at most once, nothing half-saves, only the four named hosts, the private lock, and no pushes.
- **Describe, never judge, and never predict.**
  - The Report says what was. "Notable" replaces "records": no best, worst or streaks.
  - The only forecast is the Conspiracy theorist's joke, shown only in that voice and followed by "A joke. Logbook never predicts how you’ll feel."
- **"Don't bring back" (`marks.quiet`)** entries, and the moments made from them, are left out of On this day, A random day, Echoes and Wrapped. They stay in the Report's counts and the calendar (spec section 6).
- **Private entries while locked** follow the 2c rule: no words anywhere. The Almanac uses `maskPrivate`, `maskMoments` and `visibleTags`. Random day and On this day skip private entries while locked.
- **Sharing in** makes no network request. The shared URL is kept as text and never fetched, so there's no preview. The sheet shows the title and address the other app gave.
- **The laptop keys** never fire while typing in a field: `/` search, `N` write, `←` and `→` day before and after (on a day page), `G` then `C` calendar, `G` then `T` Today, `Esc` closes sheets.
- Commit after each task on a local branch `stage-3a`, made from `main`. Never push.

## Review Focus

1. **"Don't bring back" leaking** into On this day, Random day, Echoes or Wrapped, including through the moments made from those lines. The tests are in Tasks 3, 5 and 6.
2. **Sharing in with odd input:**
   - only a URL, only text, or a URL inside the text (some apps put it in `text`);
   - very long text;
   - a `javascript:` or `data:` URL, which must never become a clickable link;
   - opening the share URL twice, or reloading after sharing, which must not keep it twice.

   The tests are in Task 7.
3. **Sparse data:** a first week with 3 days kept, a month with nothing, no firsts, no people. Every Almanac tab says so plainly, with no NaN, no "0 of 0" and no empty cards. The tests are in Tasks 3–5.
4. **Weeks and dates:**
   - the Sunday headline belongs to the week Monday to Sunday (Monday start, spec section 3), and a 1 am Monday line still belongs to Sunday (the 4 am rule);
   - "On this day" on 29 February shows 29 February only (not 28 February or 1 March);
   - in a leap year, "then and now" skips years without that date.

   The tests are in Task 3.
5. **The laptop keys firing while typing.** `N` inside the writing box must type an "n". The test is in Task 8.

---

### Task 1: Stage 2c leftovers

**Files:** `src/domain/lock.ts`, `src/db/types.ts`, `src/screens/Settings.tsx`, `src/db/stamps.ts`, `src/ui/Privacy.tsx`, `src/screens/Person.tsx`. Test: `tests/leftovers-3a.test.ts`

**Interfaces and behaviour:**
- `settings.lock` gains `userId: string`, a base64url of 16 random bytes created once. `createLock(creds, rpId, userId?)` reuses it, so "Set up the lock again" replaces the old passkey instead of adding another.
- `createLock` treats `NotAllowedError` as a quiet cancel: it returns `null`, and the caller shows nothing.
- `DayStamps.tried` becomes `{ at, lat, lon }`. The 15-minute pause is skipped when the day's position has changed since the failed try.
- `LockedEntry` keeps the entry's marks row (the plan said so in 2c), showing the words and icons only.
- The person page's Feelings filter doesn't list locked private entries while locked.

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import weather from './fixtures/openmeteo-weather.json';
import { createLock } from '../src/domain/lock';
import { openDb, type LogbookDb } from '../src/db/db';
import { ensureStamps, addWhereToday } from '../src/db/stamps';
import { saveSettings } from '../src/db/actions';
import { OfflineError } from '../src/sources/http';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('lo3a-' + n++); await db.open(); });
const cred = { rawId: new Uint8Array([1]).buffer } as unknown as Credential;
describe('2c leftovers', () => {
  it('setting the lock up again reuses the same user, so the phone replaces the passkey', async () => {
    const ids: string[] = []; const creds = { create: async (o: CredentialCreationOptions) => { ids.push(btoa(String.fromCharCode(...new Uint8Array(o.publicKey!.user.id as ArrayBuffer)))); return cred; }, get: async () => null };
    const a = await createLock(creds, 'localhost'); const b = await createLock(creds, 'localhost', a!.userId);
    expect(ids[0]).toBe(ids[1]); expect(b!.userId).toBe(a!.userId);
  });
  it('cancelling setup is quiet', async () => expect(await createLock({ create: async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }); }, get: async () => null }, 'localhost')).toBeNull());
  it('a new place is asked for at once, even just after a failure', async () => {
    await saveSettings(db, { homes: [{ name: 'H', lat: 10, lon: 20, from: '2020-01-01' }] }); const now = new Date('2026-09-29T15:00:00'); const hosts: string[] = [];
    await ensureStamps(db, '2026-09-29', now, async () => { throw new OfflineError(); });
    await addWhereToday(db, '2026-09-29', { lat: 30, lon: 40 });
    await ensureStamps(db, '2026-09-29', new Date(now.getTime() + 60_000), async u => { hosts.push(new URL(u).searchParams.get('latitude')!); return weather; });
    expect(hosts[0]).toBe('30');
  });
});
```

Run: `npx vitest run tests/leftovers-3a.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement, run, commit**

`createLock` returns `{ credentialId, userId } | null`. Settings saves both, and passes `settings.lock?.userId` when setting up again.

Run: `npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "fix: Stage 2c leftovers (one passkey, quiet cancel, a new place is asked at once, locked cards keep their marks)"
```

---

### Task 2: The Almanac in the tab bar, and its routes

**Files:** `src/router.ts`, `src/ui/Tabs.tsx`, `src/App.tsx`, `src/screens/Almanac.tsx` (the shell), `scripts/port-css-3a.py`, `src/styles/app-3a.css`, `src/main.tsx`. Test: `tests/almanac.test.tsx`

**Interfaces:**
- Routes:
  - `{ name: 'almanac'; tab?: AlmTab }`, with `AlmTab = 'report' | 'headlines' | 'wrapped' | 'random'` and hash `#/almanac?tab=wrapped` (`report` is left out of the hash);
  - `{ name: 'share' }`, hash `#/share`.
- Tabs: Today · Calendar · [+] · Shelves · Almanac (the `almanac` icon). `settings` stays a route, reached from Today's header. `Tabs current` accepts `'almanac'` and drops `'settings'`. The Settings screen shows `Tabs current=""`.
- `AlmanacView({ tab, mast: { issue: number; year: number; kept: number }, children })`:
  - the masthead ports `.mast`: "The Almanac", then "No. {n}", "{year}, so far" and "{kept} days kept";
  - `.ctabs` shows Report, Headlines, Wrapped and A random day.
  - The issue number is the months since the first kept day, plus 1.
- `scripts/port-css-3a.py` follows the 2c script, with the pattern `\.mast|\.headline\b|\.rep-|\.notes|\.records|\.rec\b|\.hline|\.prompt|\.wrapped|\.wcard|\.wk\b|\.wbig2|\.huge|\.rrow|\.thennow|\.echo|\.sharesheet|\.linkcard|\.sharenote`. The laptop's `.lp-*` rules are ported from `p7-board.css` in Task 8.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash } from '../src/router';
import { Tabs } from '../src/ui/Tabs';
import { AlmanacView } from '../src/screens/Almanac';

describe('the Almanac', () => {
  it('has its own tab, and Settings is no longer a tab', () => {
    const html = renderToStaticMarkup(<Tabs current="almanac" />);
    expect(html).toMatch(/aria-current="page" aria-label="Almanac"/); expect(html).not.toContain('aria-label="Settings"');
  });
  it('the tab is in the route', () => {
    expect(parseRoute(routeHash({ name: 'almanac', tab: 'wrapped' }))).toEqual({ name: 'almanac', tab: 'wrapped' });
    expect(routeHash({ name: 'almanac', tab: 'report' })).toBe('#/almanac'); expect(parseRoute('#/share')).toEqual({ name: 'share' });
  });
  it('the masthead names the issue, the year and the days kept', () => {
    const html = renderToStaticMarkup(<AlmanacView tab="report" mast={{ issue: 3, year: 2026, kept: 41 }}><p /></AlmanacView>);
    expect(html).toContain('The Almanac'); expect(html).toContain('No. 3'); expect(html).toContain('2026, so far'); expect(html).toContain('41 days kept');
    expect(html).toMatch(/aria-selected="true"[^>]*>Report/);
  });
});
```

Also update `tests/routes2.test.tsx` and `tests/shell.test.tsx` wherever they expect a Settings tab.

Run: `npx vitest run tests/almanac.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement, port the CSS, run, commit**

Run: `python scripts/port-css-3a.py && npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests scripts && git commit -m "feat: the Almanac takes its place in the tab bar"
```

---

### Task 3: Looking back further (pure)

**Files:** `src/domain/almanac.ts`. Test: `tests/almanac-numbers.test.ts`

**Interfaces** (all pure; `quiet` means `marks.quiet`; every function takes already-masked entries and moments):
- `yearReport(year, { entries, moments, rows, places, people }): { headline: string; numbers: { n: number; label: string; sub: string }[]; notable: { n: string; text: string; first?: boolean }[] }`.
  - The **headline** is "A {top} year, with {second} in {Month}." The Month is where the second family peaked. With one family it's "A {top} year so far."; with nothing, "Nothing kept this year yet."
  - The **numbers** are:
    - "feelings named", with "{f} families";
    - "days kept", with "{m} moments";
    - "places", with "{k} were firsts";
    - "people", with "{name} turns up most on {Weekday}s", needing at least 3 days with them.

    A number with a zero count is left out. Nothing reads "0 places".
  - The **notable** items, at most three and never more than the data supports, are:
    - "{n} {family} days in {Month}, more than any other month", when that family's top month has 3 or more days;
    - "times you named {word}, more than any other word", for the most-named word;
    - "the day you marked to keep: {date}, {first's line}", for the newest entry marked First.
- `weekOf(day): { start: string; end: string }`: Monday to Sunday (a 1 am Monday line already carries Sunday's day key).
- `weekLineSuggestion(entries, moments, week): string`:
  - "{Top family}, with {tag} and {person}." built from what exists, e.g. "Mostly calm, with #walk and Friend R.";
  - "A quiet week." when nothing was kept.
- `monthLines(year, entries, moments, today): { month: string; family?: Family; line: string }[]`: one line per month up to today, newest first. For example: "Mostly calm. 3 firsts, #walk most." or "Nothing kept."
- `onThisDay(entries, today): { year: number; entry: Entry }[]`: same month and day in earlier years, newest first, one per year (its first line), leaving out `quiet` entries. On 29 February it only matches 29 February.
- `randomDay(days: string[], rand: () => number, exclude: Set<string>)`: a kept day, not a quiet-only day.
- `thenAndNow(entries, day): { then?: { year: number; entry: Entry }; now?: Entry }`: the latest earlier year with that date, and this year's entry. Neither is quiet.
- `echoFor(moment, moments, entries): { day: string; word: string } | null`: the latest earlier day with the same word, where that day's moment isn't from a quiet line. The echo reads "Echo: you felt {word} on {date} too".

- [ ] **Step 1: Write the failing tests** (`tests/almanac-numbers.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { echoFor, monthLines, onThisDay, randomDay, thenAndNow, weekLineSuggestion, weekOf, yearReport } from '../src/domain/almanac';

const e = (id: number, day: string, x: object = {}) => ({ id, day, at: new Date(day + 'T12:00:00').getTime(), tz: 'UTC', kind: 'line', text: `line ${id}`, marks: {}, tags: [], people: [], writtenAt: 0, ...x }) as never;
const m = (id: number, day: string, word: string, family: string, entryId?: number) => ({ id, day, at: new Date(day + 'T12:00:00').getTime(), word, family, strength: 3, ...(entryId ? { entryId } : {}) }) as never;
describe('the report', () => {
  it('a sparse year says only what it knows, with no zero numbers', () => {
    const r = yearReport(2026, { entries: [e(1, '2026-09-01')], moments: [m(1, '2026-09-01', 'calm', 'calm')], rows: [], places: [], people: [] });
    expect(r.headline).toBe('A calm year so far.'); expect(r.numbers.map(x => x.label)).toEqual(['feelings named', 'days kept']); expect(JSON.stringify(r)).not.toMatch(/NaN|undefined| 0 /);
  });
  it('an empty year', () => expect(yearReport(2026, { entries: [], moments: [], rows: [], places: [], people: [] })).toEqual({ headline: 'Nothing kept this year yet.', numbers: [], notable: [] }));
  it('headline names where the second feeling peaked', () => {
    const ms = [...[1, 2, 3, 4].map(i => m(i, `2026-0${i}-10`, 'warm', 'warm')), m(9, '2026-05-02', 'tense', 'tense'), m(10, '2026-05-03', 'tense', 'tense')];
    expect(yearReport(2026, { entries: [], moments: ms, rows: [], places: [], people: [] }).headline).toBe('A warm year, with tense in May.');
  });
});
describe('weeks, days and echoes', () => {
  it('weeks run Monday to Sunday', () => { expect(weekOf('2026-09-27')).toEqual({ start: '2026-09-21', end: '2026-09-27' }); expect(weekOf('2026-09-28').start).toBe('2026-09-28'); });
  it('a week in a line, or a quiet week', () => {
    expect(weekLineSuggestion([e(1, '2026-09-22', { tags: ['walk'], people: ['R'] })], [m(1, '2026-09-22', 'calm', 'calm')], weekOf('2026-09-22'))).toBe('Mostly calm, with #walk and R.');
    expect(weekLineSuggestion([], [], weekOf('2026-09-22'))).toBe('A quiet week.');
  });
  it('on this day: earlier years only, one each, never "don’t bring back", and 29 February only on 29 February', () => {
    const es = [e(1, '2025-09-29'), e(2, '2025-09-29'), e(3, '2024-09-29', { marks: { quiet: true } }), e(4, '2026-09-29'), e(5, '2024-02-29')];
    expect(onThisDay(es, '2026-09-29').map(x => [x.year, x.entry.id])).toEqual([[2025, 1]]);
    expect(onThisDay(es, '2028-02-29').map(x => x.year)).toEqual([2024]); expect(onThisDay(es, '2027-02-28')).toEqual([]);
  });
  it('then and now skips years without the date', () => expect(thenAndNow([e(5, '2024-02-29'), e(6, '2028-02-29')], '2028-02-29')).toMatchObject({ then: { year: 2024 }, now: { id: 6 } }));
  it('a random day is never a "don’t bring back" day', () => { for (let i = 0; i < 20; i++) expect(randomDay(['a', 'b'], () => i / 20, new Set(['a']))).toBe('b'); expect(randomDay(['a'], Math.random, new Set(['a']))).toBeNull(); });
  it('an echo finds the latest earlier day with the same word, skipping quiet lines', () => {
    const ms = [m(1, '2026-03-14', 'wistful', 'wistful'), m(2, '2026-05-01', 'wistful', 'wistful', 9), m(3, '2026-09-29', 'wistful', 'wistful')];
    expect(echoFor(ms[2], ms, [e(9, '2026-05-01', { marks: { quiet: true } })])).toEqual({ day: '2026-03-14', word: 'wistful' });
    expect(echoFor(ms[0], ms, [])).toBeNull();
  });
  it('the year in twelve lines, newest first, saying so when empty', () => {
    const lines = monthLines(2026, [e(1, '2026-09-01', { marks: { first: true }, tags: ['walk'] })], [m(1, '2026-09-01', 'calm', 'calm')], '2026-09-29');
    expect(lines[0]).toMatchObject({ month: 'September', line: 'Mostly calm. 1 first, #walk most.' }); expect(lines[1]).toMatchObject({ month: 'August', line: 'Nothing kept.' }); expect(lines.length).toBe(9);
  });
});
```

Run: `npx vitest run tests/almanac-numbers.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement** each function to its interface, in the plain `Map`-count style of `looking.ts`. Reuse `dayFamilies`, `monthStats`, `wordCounts` and `dateRange`.

- [ ] **Step 3: Run, commit**

Run: `npx vitest run tests/almanac-numbers.test.ts && npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: the Almanac's numbers, lines, on this day and echoes, as plain words"
```

---

### Task 4: Report, Headlines and A random day

**Files:** `src/screens/Almanac.tsx`, `src/db/types.ts` (`DayRow.headline?: string`, kept on the week's Sunday), `src/db/actions.ts` (`setHeadline(db, sunday, text): Promise<Undo>`). Test: `tests/almanac.test.tsx` (additions)

**Interfaces and behaviour:**
- **Report** (`ReportView`):
  - the `.headline` sentence;
  - the Year ring from `draw/year.ts`, with the label "The year so far as a ring: {n} days kept, mostly {family}";
  - `.rep-row` numbers as `.rep-cell` blocks (`rn`, `rl`, `rq`);
  - the "Notable" `.records` with `.rec` items, using the First icon for the first-mark item;
  - in the Conspiracy theorist's voice only: `.rep-fore` with a joke for next month, "They say 70% {top family}. Who is ‘they’? Exactly.", followed by the hint "A joke. Logbook never predicts how you’ll feel."
- **Headlines** (`HeadlinesView`):
  - a prompt panel "{Weekday}: this week in a line", with an input whose placeholder is the suggestion and a Keep button that saves `headline` on the week's Sunday row, with Undo;
  - the hint "Logbook suggests one from your week if you leave it blank.";
  - "Weeks": the saved headlines, newest first, with "{d}–{d} {Month}", the line or the suggestion, and "suggested" marked in words;
  - "{year} in twelve lines, so far": `monthLines` with small forms.
- **A random day** (`RandomView`):
  - "A random day": the date, a form, the day's first line (private or quiet days are skipped while locked), and "Another day" and "Open this day" buttons;
  - "Then and now, {d Month}": two columns with the year, the photo of the day's thumbnail if there is one, and the line;
  - with fewer than 2 kept days: "A random day needs a few more days kept."

- [ ] **Step 1: Write the failing tests** (add to `tests/almanac.test.tsx`)
- The report for an empty year says "Nothing kept this year yet." with no `.rep-cell`.
- The Conspiracy joke appears only when `voice` is 7, and always with its hint.
- The Headlines view with no saved lines shows the suggestion as a placeholder and "suggested" beside the current week.
- The random view with 1 kept day shows the "needs a few more days" message.
- In none of these: `undefined`, `NaN` or `0 places`.

Run: `npx vitest run tests/almanac.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement, run, check in the browser at 375 px and 150%, commit**

Run: `npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: the Almanac's Report, Headlines and a random day, with then and now"
```

---

### Task 5: Wrapped, saved as pictures

**Files:** `src/draw/cards.ts`, `src/screens/Almanac.tsx`. Test: `tests/cards.test.ts`

**Interfaces:**
- `wrappedCards(month, entries, moments): Card[]`, where `Card = { kind: 'mostly' | 'firsts' | 'words' | 'people'; title: string; big: string; line: string; families: [Family, Family] }`:
  - "Your {Month}": "Mostly {family}", "{n} {family} moments, most of them {part of the month or 'on {tag}' days}."
  - "Firsts": "{n}", "{first three firsts' lines}, and {k} more."
  - "Words": "{word}", "Named {n} times this month."
  - "Together": "{name}", "{n} days together this month."

  Each card only appears when it has real data. `quiet` entries are left out (spec section 6). The song card waits for Last.fm (3b).
- `drawCard(ctx, look, w, h, card)`: a gradient between the two families, the form, and the text in a colour chosen with `onColor(mix(a, b))` for at least 4.5:1 contrast, wrapped to the width.
- `cardPng(card, look): Promise<Blob>`: an OffscreenCanvas at 1080 × 1350, `drawCard`, then PNG.
- `WrappedView`:
  - the hint "Swipe through. Each card can be saved as a picture.";
  - horizontally scrolling `.wrapped` cards, each a `Scene` with the card's words also in DOM text for screen readers;
  - a "Save as picture" button per card, which goes through `saveFile(await cardPng(...), 'logbook-{month}-{kind}.png')`;
  - with no cards: "Wrapped needs a few days kept this month."

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { wrappedCards, drawCard } from '../src/draw/cards';
import { lookOf } from '../src/draw/forms';
import { contrast, mix, onColor, palette } from '../src/domain/colour';

const e = (id: number, day: string, x: object = {}) => ({ id, day, at: 0, tz: 'UTC', kind: 'line', text: `first thing ${id}`, marks: {}, tags: [], people: [], writtenAt: 0, ...x }) as never;
const m = (id: number, day: string, word: string, family: string, entryId?: number) => ({ id, day, at: 0, word, family, strength: 3, ...(entryId ? { entryId } : {}) }) as never;
describe('wrapped', () => {
  it('only cards with real data, and never from "don’t bring back"', () => {
    const cards = wrappedCards('2026-09', [e(1, '2026-09-02', { marks: { first: true } }), e(2, '2026-09-03', { marks: { first: true, quiet: true } })], [m(1, '2026-09-02', 'calm', 'calm'), m(2, '2026-09-03', 'calm', 'calm', 2)]);
    expect(cards.map(c => c.kind)).toEqual(['mostly', 'firsts', 'words']); expect(cards[1].big).toBe('1'); expect(JSON.stringify(cards)).not.toContain('first thing 2');
    expect(wrappedCards('2026-09', [], [])).toEqual([]);
  });
  it('card text always reads against its background', () => {
    for (const theme of ['dark', 'light'] as const) { const p = palette(theme); for (const [a, b] of [['bright', 'warm'], ['low', 'tense'], ['calm', 'curious']] as const) { const bg = mix(p[a], p[b], 0.5); expect(contrast(onColor(bg), bg)).toBeGreaterThanOrEqual(4.5); } }
  });
  it('draws without errors', () => {
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 40 }) : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D;
    drawCard(ctx, lookOf('dark'), 1080, 1350, { kind: 'firsts', title: 'Firsts', big: '6', line: 'A new café, a lake, the best chai of your life, and three more.', families: ['calm', 'curious'] });
  });
});
```

Run: `npx vitest run tests/cards.test.ts`. Expected: FAIL. If the contrast test fails for any pair, fix `onColor` or the card background (darken the mix), not the test.

- [ ] **Step 2: Implement, run, check a saved PNG by eye, commit**

Run: `npm test && npm run typecheck`. Expected: PASS. In the browser, save one card and open the PNG to check it.

```bash
git add -A src tests && git commit -m "feat: Wrapped, as cards you can save as pictures"
```

---

### Task 6: On this day, and echoes

**Files:** `src/screens/Today.tsx`, `src/screens/DayPage.tsx`. Test: `tests/looking-back-screens.test.tsx`

**Behaviour:**
- **On this day:** a panel on Today, placed after stamps and before grateful (spec order), titled "On this day, {year}". It shows the entry's line as a KeptCard-style rich line, plus a "Then and now" button to `#/almanac?tab=random`. It appears only when `onThisDay` finds something. At night it folds into "Today so far", whose summary adds "on this day".
- **Echoes:** under each story item on the day page, when `echoFor` finds one, an `.echo` button "Echo: you felt {word} on {d Month} too" opens that day. Moments masked as private get no echo.

- [ ] **Step 1: Write the failing tests** for `TodayView` and `DayPageView`:
- The panel shows with an earlier-year entry and is absent without one.
- A quiet earlier entry never shows.
- Echo text renders for a repeated word and not for a private feeling.

Run: `npx vitest run tests/looking-back-screens.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement, run, commit**

Run: `npm test && npm run typecheck`. Expected: PASS.

```bash
git add -A src tests && git commit -m "feat: on this day on Today, and echoes on the day page"
```

---

### Task 7: Sharing into Logbook

**Files:**
- Modify: `vite.config.ts` (manifest `share_target`), `src/db/types.ts` (`EntryKind` gains `'link'`; `EntryData` gains `{ kind: 'link'; url: string; title?: string }`), `src/domain/entryText.ts`, `src/screens/KeptCard.tsx`, `src/main.tsx`
- Create: `src/share.ts`, `src/screens/ShareSheet.tsx`
- Test: `tests/share.test.tsx`

**Interfaces:**
- The manifest gets `share_target: { action: './', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } }`.
- `readShare(search: string): { title: string; text: string; url: string } | null`:
  - it pulls the first `https?://` URL out of `text` when `url` is empty;
  - it strips that URL from the text;
  - it trims each part to 2,000 characters;
  - it returns null when all three are empty.
- `safeUrl(u): string | null`: only `http:` and `https:` pass. `javascript:`, `data:` and anything else give null, and the address is kept as plain text only.
- `consumeShare()`, in `main.tsx` before render:
  - if `readShare(location.search)` returns something, save it to `sessionStorage['logbook-share']` (guarded);
  - `history.replaceState` to `location.pathname + '#/share'`;
  - reloading after that sees no query, so nothing is kept twice.
- `ShareSheetView({ shared, as, line, onAs, onLine, onKeep, onCancel })`:
  - ports `shareMock`: "Keep in Logbook", a `.linkcard` with the title and the host of `safeUrl` (or "Shared text"), and chips "Watched", "A link" and "A quote";
  - "A quote" is only offered when there's text;
  - "Your line (optional)";
  - Keep names what it keeps.
- Keeping:
  - "Watched" goes to the media form, prefilled with the title (media `Other`), so the owner rates it 1–7 there;
  - "A link" makes `keepEntry` kind `link`, with `data { url: safeUrl or '', title }` and `text` = the owner's line;
  - "A quote" makes a quote entry, with `text` = the shared text and `who: 'A book or film'`.
- `entryLine` for `link`: `Link: {title or host}.{ line}`. `KeptCard` shows the title, and the host as an `<a href rel="noopener noreferrer" target="_blank">` only when `safeUrl` passes; otherwise it's plain text. The export writes `[title](url)` only for a safe URL.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readShare, safeUrl } from '../src/share';
import { entryLine } from '../src/domain/entryText';
import { ShareSheetView } from '../src/screens/ShareSheet';

const lk = { places: new Map(), spans: new Map(), people: new Map() };
describe('sharing in', () => {
  it('finds the link in the text when an app puts it there', () => expect(readShare('?title=How%20rivers&text=Look%20https%3A%2F%2Fexample.com%2Fv%3F1')).toEqual({ title: 'How rivers', text: 'Look', url: 'https://example.com/v?1' }));
  it('nothing shared is nothing', () => expect(readShare('?title=&text=&url=')).toBeNull());
  it('very long text is trimmed', () => expect(readShare('?text=' + 'a'.repeat(5000))!.text.length).toBe(2000));
  it('only web addresses can be links', () => { expect(safeUrl('javascript:alert(1)')).toBeNull(); expect(safeUrl('data:text/html,x')).toBeNull(); expect(safeUrl('https://example.com')).toBe('https://example.com/'); });
  it('a kept link reads in words', () => expect(entryLine({ id: 1, day: 'd', at: 0, tz: 'UTC', kind: 'link', text: 'Made me want to walk.', marks: {}, tags: [], people: [], writtenAt: 0, data: { kind: 'link', url: 'https://example.com/v', title: 'How rivers find their way' } }, lk)).toBe('Link: How rivers find their way. Made me want to walk.'));
  it('the sheet offers the three ways, and a quote only with text', () => {
    const html = renderToStaticMarkup(<ShareSheetView shared={{ title: 'How rivers', text: '', url: 'https://example.com/v' }} as="link" line="" onAs={() => {}} onLine={() => {}} onKeep={() => {}} onCancel={() => {}} />);
    expect(html).toContain('Keep in Logbook'); expect(html).toContain('example.com'); expect(html).toContain('Watched'); expect(html).not.toContain('A quote');
  });
  it('an unsafe address is shown as text, never a link', () => {
    const html = renderToStaticMarkup(<ShareSheetView shared={{ title: 'x', text: '', url: 'javascript:alert(1)' }} as="link" line="" onAs={() => {}} onLine={() => {}} onKeep={() => {}} onCancel={() => {}} />);
    expect(html).not.toContain('href="javascript');
  });
});
```

Run: `npx vitest run tests/share.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement, run, check in the browser, commit**

Run: `npm test && npm run typecheck && npm run build`. Expected: PASS, and `dist/manifest.webmanifest` contains `share_target`.

In the browser, open `/?title=T&text=hello%20https://example.com` and check:
- the sheet opens;
- the address bar is clean;
- a reload doesn't reopen it.

```bash
git add -A src tests vite.config.ts && git commit -m "feat: share links, videos and text into Logbook"
```

---

### Task 8: The laptop reading room

**Files:**
- Create: `src/screens/Desk.tsx`, `src/ui/keys.ts`, `src/ui/useWide.ts`, `src/styles/app-desk.css` (ported `.lp-*`, `.keys` from `p7-board.css` by `scripts/port-css-desk.py`)
- Modify: `src/App.tsx`, `src/screens/Today.tsx`, `src/screens/DayPage.tsx`
- Test: `tests/desk.test.tsx`

**Interfaces:**
- `useWide(): boolean`: `matchMedia('(min-width: 1024px)')`, kept up to date on change, and false during tests and SSR.
- `keyAction(e: { key: string; target: { tagName?: string; isContentEditable?: boolean } | null; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }, pending: string | null): { action?: 'search' | 'write' | 'prev' | 'next' | 'calendar' | 'today' | 'close'; pending: string | null }`:
  - it returns nothing inside `input`, `textarea` or `select`, or in contenteditable, except `Escape`;
  - with a modifier held, it returns nothing;
  - `/` gives search, `n`/`N` gives write, `ArrowLeft` gives prev, `ArrowRight` gives next, and `Escape` gives close;
  - `g` then `c` gives calendar, and `g` then `t` gives today. The `pending` value is `'g'` for the next key only.
- `DeskView({ left, mid, right })`: the three columns, ported from `laptopMock`.
  - **Left:** the brand, a search button with a `/` hint, the nav (Today, Calendar, Shelves, Almanac), a small month calendar of forms (reusing `Glyph`), and spans.
  - **Middle:** the date, the Outside line, the voice's greeting, the writing box (the same `LineWriter`, with larger type through `.lp-write`), then the day's bloom and story.
  - **Right:** today's stamps (`.stamps.one`), "Together today" faces, and a "Keys" `<dl>`. Health's postcard is left for 3b, with no empty slot.
- The App renders Today and DayPage inside `DeskView` when `useWide()` is true. The phone layout is unchanged below 1024 px, and the tab bar is hidden on the desk (the left nav replaces it).
- `useKeys()` is mounted once in `App`. It maps actions to `go(...)`, focuses the writing box (a `data-write` attribute), and moves between day pages.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { keyAction } from '../src/ui/keys';
import { DeskView } from '../src/screens/Desk';

const body = { tagName: 'BODY' }, box = { tagName: 'TEXTAREA' };
describe('laptop keys', () => {
  it('never fire while typing, except Escape', () => {
    expect(keyAction({ key: 'n', target: box }, null).action).toBeUndefined();
    expect(keyAction({ key: '/', target: { tagName: 'INPUT' } }, null).action).toBeUndefined();
    expect(keyAction({ key: 'Escape', target: box }, null).action).toBe('close');
  });
  it('single keys and the g-sequences', () => {
    expect(keyAction({ key: '/', target: body }, null).action).toBe('search');
    expect(keyAction({ key: 'N', target: body }, null).action).toBe('write');
    const g = keyAction({ key: 'g', target: body }, null); expect(g).toEqual({ pending: 'g' });
    expect(keyAction({ key: 'c', target: body }, g.pending).action).toBe('calendar'); expect(keyAction({ key: 't', target: body }, 'g').action).toBe('today');
    expect(keyAction({ key: 'c', target: body }, null).action).toBeUndefined();
  });
  it('keys with Ctrl or Cmd are left to the browser', () => expect(keyAction({ key: 'n', target: body, ctrlKey: true }, null).action).toBeUndefined());
});
describe('the reading room', () => {
  it('three columns, with the keys written out', () => {
    const html = renderToStaticMarkup(<DeskView left={<p>L</p>} mid={<p>M</p>} right={<p>R</p>} />);
    expect(html).toMatch(/lp-left[^]*L[^]*lp-mid[^]*M[^]*lp-right[^]*R/); expect(html).toContain('day before, day after');
  });
});
```

Run: `npx vitest run tests/desk.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement, run, check in the browser at 1280 × 800 and at 1024 px, commit**

Run: `npm test && npm run typecheck`. Expected: PASS.

In the browser:
1. At 1280 × 800 and at 1024 px, check the three columns and that nothing is under 13 px.
2. Type "n" in the box. Expected: an "n" appears.
3. Press `/`. Expected: search opens.
4. On a day page, press ← and →. Expected: the day before and after.
5. At 800 px. Expected: the phone layout returns.

```bash
git add -A src tests scripts && git commit -m "feat: the laptop reading room, with keyboard keys"
```

---

### Task 9: The whole-app check

- [ ] Add the Almanac views, Wrapped, the Share sheet and the Desk view to the clean-render check. Each is rendered empty and full, and locked and unlocked where it applies.
- [ ] Run: `npm test && npm run typecheck && npm run build`. Expected: PASS.
- [ ] Run the probe on the Almanac's four tabs, the share sheet, and the desk at 1280 px, at 100% and 150%. Expected: `small` and `tiny` empty, `over` false.
- [ ] Commit, and hand over for the review.

```bash
git add -A src tests && git commit -m "test: Stage 3a whole-app check"
```
