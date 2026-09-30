# Logbook Stage 1 (the daily core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first usable Logbook. It is an installed, offline web app. You write today's line with # tags, @ people and : feelings, keep feelings (right now or for the whole day) with Undo, read each day on the Bloom or Score day page, browse the month, set the basics, and export everything as Markdown or a JSON backup.

**Architecture:**
- It is a Vite + React + TypeScript PWA, set up like the Health app next door (`../Health`).
- Pure logic lives in `src/domain` and `src/vocab`. It has no React and no database, and is tested directly.
- Persistence is a Dexie database named `logbook` (`src/db`). Every change goes through small action functions that return an Undo handle.
- Screens are split into a pure `…View` component (rendered in tests with `renderToStaticMarkup`) and a thin container that reads the database with `useLiveQuery`.
- Canvas drawings are ported from the approved pinboard source in `design/pinboard8-source/`.

**Tech Stack:**
- Vite 8, React 19, TypeScript 7 and Dexie 4 with dexie-react-hooks.
- vite-plugin-pwa for installing and offline use.
- Vitest 5 with fake-indexeddb for tests.
- Fonts from `@fontsource/atkinson-hyperlegible` and `@fontsource-variable/archivo`.
- Publishing: GitHub Pages via GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-30-logbook-design.md` (read it first). The product brief is `PRODUCT.md`. The approved look is `design/logbook-pinboard-8.html`, with its source in `design/pinboard8-source/`.

## Global Constraints

- The address never changes: `https://pohtato-potato.github.io/logbook/`. Use `base: './'`, and the manifest `scope` and `start_url` are `./`.
- The IndexedDB database name is `logbook`. Never read or write Health's `health` database in Stage 1.
- No personal data in the repo. Names, homes, birthdays, usernames and keys arrive only through the private starter file. Example data in tests uses "Friend A" style initials only.
- Nothing is loaded from outside the app. Fonts are bundled; there are no CDN links and no analytics. Stage 1 makes **no network requests at all**.
- A day ends at 4 am. Weeks start on Monday.
- Night mode on Today runs from 12 am to 5 am (hours 0 to 4 inclusive).
- Dark theme by default. Luminous colours in dark, Pigment in light.
- Type sizes:
  - body 16px (1rem), secondary 14px (0.875rem), nothing under 13px (0.8125rem);
  - all sizes in rem;
  - every control at least 44px; tags and names inside sentences may be 36px.
- Colour never carries meaning alone. A feeling always shows its form or its word. Tags show `#` and their name, marks show their icon and word, people show their initial.
- Feelings are never scored, ranked or charted as better or worse.
- No reminders, streaks or achievements.
- Every task ends with `npm test` and `npm run typecheck` passing.
- Commits: commit after each task on a local branch. **Never push**; the owner pushes or asks for a push.

## Review Focus

1. **Writing just after midnight:** a line kept at 00:30 or 03:59 belongs to the previous day's page. A line at 04:00 belongs to the new day. Night mode is still on at 04:30. The tests live in Task 2 and Task 6.
2. **A `:word` that isn't in the vocabulary** (a typo like `:asdf`) stays plain text. It creates no moment, no chip and no crash. The tests live in Task 5 and Task 11.
3. **Undo pressed twice, or after the screen changed:** the second press does nothing, and Undo never deletes something it didn't create. The tests live in Task 6.
4. **A broken or unexpected starter file** (wrong JSON, missing `format`, a person without an initial) shows a plain message. Nothing is written to the database. The tests live in Task 8.
5. **Storage full while keeping a line:** the draft stays in the box, a plain message says nothing was lost, and nothing half-saves. The tests live in Task 6 and Task 11.

---

## File map

```
package.json, tsconfig.json, vite.config.ts, vitest.config.ts, index.html, .github/workflows/deploy.yml, README.md
scripts/extract-vocab.mjs         turns design/pinboard8-source/atlas-data.js + p7-data2.js into src/vocab/*.json
scripts/make-icons.mjs            app icons (copied from Health, recoloured)
public/icons/*                    generated icons
src/main.tsx, src/App.tsx         boot, persistent-storage request, hash router
src/router.ts                     useRoute(): current route from location.hash
src/domain/day.ts                 dayKey, isNight, addDays, weekStartOf, parseDay, timeZone
src/domain/colour.ts              palettes, contrast, onColor, solid, inkOf, mix, mixOk, familyColour, tagFamily
src/domain/line.ts                tokenize, tokenAt, tagsOf, peopleOf, feelingsOf, momentFromLine, removeFeelingToken
src/domain/voices.ts              the eight voices and their greetings
src/domain/markdown.ts            dayToMarkdown
src/domain/zip.ts                 makeZip (stored, no compression), crc32
src/vocab/atlas.json              generated: families, words, rare words, blends
src/vocab/dictionary.json         generated: everyday words -> family + Atlas words
src/vocab/vocab.ts                FAMILIES, FAMILY_INFO, allWords, findWord, feelingOf, searchFeelings, ladderName
src/db/types.ts                   row types
src/db/db.ts                      Dexie schema v1, openDb()
src/db/actions.ts                 keepLine, keepMoment, setOverall, removeFeeling, removeEntry, updateEntryText, StorageFullError
src/db/backup.ts                  makeBackup, restoreBackup
src/db/exportMarkdown.ts          makeMarkdownZip
src/db/starter.ts                 parseStarter, applyStarter, StarterError
src/draw/forms.ts                 drawForm, drawSmall (Lines forms + small silhouettes)
src/draw/day.ts                   drawBloomLine, drawScoreLine
src/draw/Canvas.tsx               <Scene/> canvas host with one shared animation loop
src/styles/tokens.css, app.css    dark/light tokens, type scale, components
src/ui/Tabs.tsx, Sheet.tsx, Undo.tsx, Icons.tsx, Chips.tsx
src/screens/Today.tsx, LineWriter.tsx, FeelingPicker.tsx, FeelingCard.tsx, DayPage.tsx, Calendar.tsx, Settings.tsx, FirstRun.tsx
tests/*.test.ts(x)                one test file per module
```

---

### Task 1: Project set-up that builds, tests and publishes

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/env.d.ts`, `.github/workflows/deploy.yml`, `README.md`, `tests/smoke.test.ts`
- Modify: `.gitignore` (already exists; keep it as is)

**Interfaces:**
- Produces: `npm test`, `npm run typecheck`, `npm run build`, `npm run dev`. `App` renders `<div id="app-root">` for now.

- [ ] **Step 1: Write package.json**

```json
{
  "name": "logbook",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "A low-effort personal archive: a web app installed from Chrome. All data stays on the phone.",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc -p tsconfig.json",
    "preview": "vite preview",
    "test": "vitest run",
    "vocab": "node scripts/extract-vocab.mjs",
    "icons": "node scripts/make-icons.mjs"
  },
  "dependencies": {
    "@fontsource-variable/archivo": "^5.3.0",
    "@fontsource/atkinson-hyperlegible": "^5.3.0",
    "dexie": "^4.4.6",
    "dexie-react-hooks": "^4.4.0",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
  "devDependencies": {
    "@resvg/resvg-js": "^2.6.2",
    "@types/node": "^24.19.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.1",
    "fake-indexeddb": "^6.2.5",
    "typescript": "^7.0.2",
    "vite": "^8.3.1",
    "vite-plugin-pwa": "^1.3.0",
    "vitest": "^5.0.2"
  }
}
```

- [ ] **Step 2: Copy Health's TypeScript and Vitest configs**

Run:
```bash
cp ../Health/tsconfig.json ./tsconfig.json
cp ../Health/vitest.config.ts ./vitest.config.ts
cp ../Health/src/env.d.ts ./src/env.d.ts
```
Then open `vitest.config.ts` and make sure it contains `setupFiles: ['fake-indexeddb/auto']` and `environment: 'node'`. If either is missing, add it inside `test: { … }`. Also make sure `tsconfig.json`'s `include` is `["src", "tests", "vite.config.ts"]`.

- [ ] **Step 3: Write vite.config.ts**

```ts
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // Relative paths, so the same build works at /logbook/ on the shared website.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Logbook',
        short_name: 'Logbook',
        description: 'A low-effort archive of your life. Everything stays on this phone.',
        start_url: './#/today',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0F1317',
        theme_color: '#0F1317',
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        // Only clears caches this app made; Health's caches on the same website are never touched.
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { port: 5174, fs: { deny: ['.env', '.env.*', '**/.git/**', '**/private/**'] } },
  preview: { port: 4174 },
});
```

- [ ] **Step 4: Write index.html, main.tsx and App.tsx**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0F1317" />
    <title>Logbook</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/atkinson-hyperlegible/400-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import { App } from './App';

// Ask the browser not to clear Logbook's storage under pressure. It's fine if it says no.
if (navigator.storage && navigator.storage.persist) void navigator.storage.persist();

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

`src/App.tsx`:
```tsx
export function App() {
  return <div id="app-root">Logbook</div>;
}
```

- [ ] **Step 5: Write the smoke test**

`tests/smoke.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { App } from '../src/App';

describe('app shell', () => {
  it('renders', () => {
    expect(renderToStaticMarkup(createElement(App))).toContain('app-root');
  });
});
```

- [ ] **Step 6: Install and run**

Run: `npm install && npm test && npm run typecheck && npm run build`
Expected: 1 test passes, typecheck is clean, and `dist/` contains `index.html`, `manifest.webmanifest` and `sw.js`.

- [ ] **Step 7: Publishing workflow and README**

Copy `../Health/.github/workflows/deploy.yml` to `.github/workflows/deploy.yml` unchanged, apart from the first two comment lines:
```yaml
# Builds Logbook and publishes it to GitHub Pages on every push to main.
# The code holds no personal data: entries, photos and the starter file live on the phone.
```
Write `README.md`:
```markdown
# Logbook

A low-effort personal archive, built as an installable web app (PWA) for an Android phone and a laptop.

**Open it:** https://pohtato-potato.github.io/logbook/. In Chrome on the phone, tap ⋮ then **Add to Home screen**.

- **Everything stays on the phone.** Data lives in the browser's IndexedDB (`logbook`). No server, account or analytics.
- **The code holds no personal data.** Names, homes and keys arrive through a private starter file kept out of this repo.
- **The archive outlives the app.** Settings → Export makes a zip of plain Markdown files, one per day.

## Develop

    npm install
    npm run dev      # http://localhost:5174
    npm test
    npm run build

Design: `PRODUCT.md`, `docs/superpowers/specs/`, `design/logbook-pinboard-8.html`.
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src tests .github README.md
git commit -m "chore: set up Logbook like Health (Vite, React, Dexie, PWA, tests, Pages)"
```

---

### Task 2: Days, the 4 am rule and night mode

**Files:**
- Create: `src/domain/day.ts`
- Test: `tests/day.test.ts`

**Interfaces:**
- Produces:
  - `dayKey(at: Date): string` returns the logical day as `YYYY-MM-DD` in local time;
  - `isNight(at: Date): boolean`;
  - `addDays(day: string, n: number): string`;
  - `weekStartOf(day: string): string` returns a Monday;
  - `parseDay(day: string): Date` returns local noon;
  - `timeZone(): string`;
  - `timeLabel(at: Date): string` returns e.g. `"11:24 pm"`;
  - `DAY_ENDS_AT_HOUR = 4`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { addDays, dayKey, isNight, parseDay, timeLabel, weekStartOf } from '../src/domain/day';

const at = (s: string) => new Date(s); // local time, no Z

describe('dayKey', () => {
  it('belongs to the same date during the day', () => expect(dayKey(at('2026-09-29T13:00:00'))).toBe('2026-09-29'));
  it('belongs to the previous day before 4 am', () => {
    expect(dayKey(at('2026-09-30T00:30:00'))).toBe('2026-09-29');
    expect(dayKey(at('2026-09-30T03:59:59'))).toBe('2026-09-29');
  });
  it('starts the new day at 4 am', () => expect(dayKey(at('2026-09-30T04:00:00'))).toBe('2026-09-30'));
  it('crosses a month and a year', () => {
    expect(dayKey(at('2026-10-01T02:00:00'))).toBe('2026-09-30');
    expect(dayKey(at('2027-01-01T01:00:00'))).toBe('2026-12-31');
  });
});

describe('isNight', () => {
  it('is night from 12 am to before 5 am', () => {
    expect(isNight(at('2026-09-30T00:00:00'))).toBe(true);
    expect(isNight(at('2026-09-30T04:30:00'))).toBe(true);
    expect(isNight(at('2026-09-30T05:00:00'))).toBe(false);
    expect(isNight(at('2026-09-29T23:59:00'))).toBe(false);
  });
});

describe('calendar helpers', () => {
  it('adds days across months', () => expect(addDays('2026-09-29', 3)).toBe('2026-10-02'));
  it('weeks start on Monday', () => {
    expect(weekStartOf('2026-09-29')).toBe('2026-09-28'); // Tuesday -> Monday
    expect(weekStartOf('2026-10-04')).toBe('2026-09-28'); // Sunday -> the Monday before
    expect(weekStartOf('2026-09-28')).toBe('2026-09-28');
  });
  it('parses to local noon so time zones never shift the date', () => expect(parseDay('2026-09-29').getHours()).toBe(12));
  it('labels times in 12-hour style', () => {
    expect(timeLabel(at('2026-09-29T23:24:00'))).toBe('11:24 pm');
    expect(timeLabel(at('2026-09-29T00:05:00'))).toBe('12:05 am');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/day.test.ts`
Expected: FAIL, "Failed to resolve import ../src/domain/day".

- [ ] **Step 3: Implement**

```ts
/* A day ends at 4 am: anything before then belongs to the day before. All dates are local. */
export const DAY_ENDS_AT_HOUR = 4;
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function dayKey(at: Date): string {
  const d = new Date(at.getTime());
  if (d.getHours() < DAY_ENDS_AT_HOUR) d.setDate(d.getDate() - 1);
  return ymd(d);
}
/* Today's quiet night layout runs from 12 am to 5 am. */
export function isNight(at: Date): boolean {
  return at.getHours() < 5;
}
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export function weekStartOf(day: string): string {
  const back = (parseDay(day).getDay() + 6) % 7; // Monday = 0
  return addDays(day, -back);
}
export function timeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
export function timeLabel(at: Date): string {
  const h = at.getHours(), m = at.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`;
}
```

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run tests/day.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/day.ts tests/day.test.ts
git commit -m "feat: the 4 am day, Monday weeks and night hours"
```

---

### Task 3: The feelings vocabulary and its search

**Files:**
- Create: `scripts/extract-vocab.mjs`, `src/vocab/atlas.json` (generated), `src/vocab/dictionary.json` (generated), `src/vocab/vocab.ts`
- Test: `tests/vocab.test.ts`

**Interfaces:**
- Produces (from `src/vocab/vocab.ts`):
  - `type Family = 'bright'|'proud'|'curious'|'calm'|'warm'|'wistful'|'low'|'tense'|'heated'`
  - `FAMILIES: Family[]` (in that order)
  - `FAMILY_NAME: Record<Family,string>` (e.g. `"Wistful"`)
  - `FAMILY_INFO: Record<Family,{holds:string; ladder:[string,string][]}>`
  - `interface Word { w:string; family:Family; group:string; s:number; meaning:string; about:string[]; close:string[]; lang?:string }`
  - `interface Blend { name:string; a:Family; b:Family; meaning:string }`
  - `ALL_WORDS: Word[]`, `RARE_WORDS: Word[]`, `BLENDS: Blend[]`
  - `groupsOf(f: Family): { group:string; words:Word[] }[]`
  - `findWord(w: string, own: Record<string,Family>): Word | null`
  - `feelingOf(token: string, own: Record<string,Family>): { w:string; family:Family } | null`
  - `interface Match { w:string; family:Family; note:string; kind:'own'|'atlas'|'slang'|'rare'|'near' }`
  - `searchFeelings(q: string, own: Record<string,Family>, limit?: number): Match[]`
  - `slangTargets(term: string): string[]`
  - `ladderName(f: Family, strength: number): string` (e.g. `ladderName('wistful',3) === 'Soft rain at dusk'`)

- [ ] **Step 1: Write the extraction script**

This turns the approved vocabulary into plain JSON. The pinboard held it as JavaScript.

`scripts/extract-vocab.mjs`:
```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const src = 'design/pinboard8-source/';
const atlasJs = readFileSync(src + 'atlas-data.js', 'utf8');
const ATLAS = new Function(atlasJs + '; return ATLAS;')();
const out = {
  families: ATLAS.FAM.map(f => ({ id: f.id, holds: f.holds, ladder: f.ladder })),
  // WORDS[family] = [[group, [[word, strength, meaning, about[], close[]], ...]], ...]
  words: ATLAS.WORDS,
  rare: ATLAS.RARE.map(([w, lang, family, meaning]) => ({ w, lang, family, meaning })),
  blends: ATLAS.BLENDS.map(b => ({ name: b.n, a: b.a, b: b.b, meaning: b.m })),
};
const data2 = readFileSync(src + 'p7-data2.js', 'utf8');
const raw = data2.slice(data2.indexOf('const raw = `') + 13, data2.indexOf('`;', data2.indexOf('const raw = `')));
const dict = {};
raw.split(';').map(s => s.trim()).filter(Boolean).forEach(row => {
  const [k, f, ws] = row.split('|');
  dict[k.trim()] = { family: f.trim(), words: ws.split(',').map(x => x.trim()) };
});
mkdirSync('src/vocab', { recursive: true });
writeFileSync('src/vocab/atlas.json', JSON.stringify(out));
writeFileSync('src/vocab/dictionary.json', JSON.stringify(dict));
console.log(`families ${out.families.length}, dictionary ${Object.keys(dict).length}`);
```

Run: `npm run vocab`
Expected: `families 9, dictionary 320`.

- [ ] **Step 2: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { ALL_WORDS, BLENDS, FAMILIES, RARE_WORDS, feelingOf, findWord, groupsOf, ladderName, searchFeelings, slangTargets } from '../src/vocab/vocab';

describe('the vocabulary', () => {
  it('has nine families and all 242 Atlas words', () => {
    expect(FAMILIES).toEqual(['bright','proud','curious','calm','warm','wistful','low','tense','heated']);
    expect(ALL_WORDS.length).toBe(242);
    expect(RARE_WORDS.length).toBe(51);
    expect(BLENDS.length).toBe(18);
  });
  it('groups words by family', () => expect(groupsOf('calm')[0].words.map(w => w.w)).toContain('calm'));
  it('finds Atlas, rare and own words', () => {
    expect(findWord('nostalgic', {})?.family).toBe('wistful');
    expect(findWord('saudade', {})?.lang).toBe('Portuguese');
    expect(findWord('glimmery', { glimmery: 'bright' })?.family).toBe('bright');
    expect(findWord('zzz', {})).toBeNull();
  });
  it('reads tokens typed in a line, including slang and hyphens', () => {
    expect(feelingOf('pooped', {})).toEqual({ w: 'pooped', family: 'low' });
    expect(feelingOf('mood-off', {})?.family).toBe('heated');
    expect(feelingOf('asdf', {})).toBeNull();
  });
  it('searches slang, typos and own words', () => {
    for (const q of ['mid', 'pooped', 'agog', 'knackered', 'udaas', 'lugubrious', 'hangry']) expect(searchFeelings(q, {}).length).toBeGreaterThan(0);
    expect(searchFeelings('nostalgik', {})[0].kind).toBe('near');
    expect(searchFeelings('glim', { glimmery: 'bright' })[0]).toMatchObject({ w: 'glimmery', kind: 'own' });
    expect(searchFeelings('', {})).toEqual([]);
  });
  it('every everyday word points at real Atlas words', () => {
    expect(slangTargets('pooped').every(w => findWord(w, {}))).toBe(true);
  });
  it('names strengths with the weather ladder', () => {
    expect(ladderName('wistful', 3)).toBe('Soft rain at dusk');
    expect(ladderName('calm', 9)).toBe(ladderName('calm', 5));
  });
});
```

Run: `npx vitest run tests/vocab.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement vocab.ts**

```ts
import atlas from './atlas.json';
import dict from './dictionary.json';

export type Family = 'bright' | 'proud' | 'curious' | 'calm' | 'warm' | 'wistful' | 'low' | 'tense' | 'heated';
export const FAMILIES: Family[] = ['bright', 'proud', 'curious', 'calm', 'warm', 'wistful', 'low', 'tense', 'heated'];
export const FAMILY_NAME: Record<Family, string> = { bright: 'Bright', proud: 'Proud', curious: 'Curious', calm: 'Calm', warm: 'Warm', wistful: 'Wistful', low: 'Low', tense: 'Tense', heated: 'Heated' };
export interface Word { w: string; family: Family; group: string; s: number; meaning: string; about: string[]; close: string[]; lang?: string }
export interface Blend { name: string; a: Family; b: Family; meaning: string }
export interface Match { w: string; family: Family; note: string; kind: 'own' | 'atlas' | 'slang' | 'rare' | 'near' }

type RawWord = [string, number, string, string[]?, string[]?];
const A = atlas as unknown as { families: { id: Family; holds: string; ladder: [string, string][] }[]; words: Record<Family, [string, RawWord[]][]>; rare: { w: string; lang: string; family: Family; meaning: string }[]; blends: Blend[] };
const D = dict as Record<string, { family: Family; words: string[] }>;

export const FAMILY_INFO = Object.fromEntries(A.families.map(f => [f.id, { holds: f.holds, ladder: f.ladder }])) as Record<Family, { holds: string; ladder: [string, string][] }>;
export const ALL_WORDS: Word[] = FAMILIES.flatMap(family => A.words[family].flatMap(([group, ws]) => ws.map(([w, s, meaning, about, close]) => ({ w, family, group, s, meaning, about: about ?? [], close: close ?? [] }))));
export const RARE_WORDS: Word[] = A.rare.map(r => ({ w: r.w, family: r.family, group: 'From other languages', s: 3, meaning: r.meaning, about: [], close: [], lang: r.lang }));
export const BLENDS: Blend[] = A.blends;
const INDEX = new Map(ALL_WORDS.map(w => [w.w, w]));
const RARE = new Map(RARE_WORDS.map(w => [w.w, w]));

export function groupsOf(f: Family): { group: string; words: Word[] }[] {
  return A.words[f].map(([group]) => ({ group, words: ALL_WORDS.filter(w => w.family === f && w.group === group) }));
}
const norm = (s: string) => s.trim().toLowerCase().replace(/[-_]/g, ' ');
export function findWord(w: string, own: Record<string, Family>): Word | null {
  const k = norm(w);
  return INDEX.get(k) ?? RARE.get(k) ?? (own[k] ? { w: k, family: own[k], group: 'Your words', s: 3, meaning: 'Your own word.', about: [], close: [] } : null);
}
export function feelingOf(token: string, own: Record<string, Family>): { w: string; family: Family } | null {
  const k = norm(token), x = findWord(k, own);
  if (x) return { w: k, family: x.family };
  if (D[k]) return { w: k, family: D[k].family };
  return null;
}
export function slangTargets(term: string): string[] {
  return (D[norm(term)]?.words ?? []).filter(w => INDEX.has(w));
}
export function ladderName(f: Family, strength: number): string {
  const s = Math.max(1, Math.min(5, Math.round(strength || 3)));
  return FAMILY_INFO[f].ladder[s - 1][1];
}
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/* Own words first, then the 242, then everyday words, then words from other languages; close typos only when little else matched. */
export function searchFeelings(q: string, own: Record<string, Family>, limit = 8): Match[] {
  q = norm(q);
  if (!q) return [];
  const res: Match[] = [], seen = new Set<string>();
  const add = (m: Match) => { const k = m.w + '|' + m.kind; if (!seen.has(k)) { seen.add(k); res.push(m); } };
  Object.entries(own).forEach(([w, family]) => { if (w.includes(q)) add({ w, family, note: 'your own word', kind: 'own' }); });
  ALL_WORDS.filter(x => x.w.includes(q)).sort((a, b) => a.w.indexOf(q) - b.w.indexOf(q) || a.w.length - b.w.length).forEach(x => add({ w: x.w, family: x.family, note: x.meaning, kind: 'atlas' }));
  Object.entries(D).filter(([k]) => k.includes(q) || k.replace(/ /g, '') === q.replace(/ /g, '')).forEach(([k, v]) => add({ w: k, family: v.family, note: 'means ' + slangTargets(k).join(', '), kind: 'slang' }));
  RARE_WORDS.filter(r => r.w.includes(q)).forEach(r => add({ w: r.w, family: r.family, note: `${r.lang}: ${r.meaning}`, kind: 'rare' }));
  if (res.length < 3 && q.length >= 4) {
    const pool: Match[] = [...ALL_WORDS.map(x => ({ w: x.w, family: x.family, note: x.meaning, kind: 'near' as const })), ...Object.entries(D).map(([k, v]) => ({ w: k, family: v.family, note: 'means ' + v.words.join(', '), kind: 'near' as const }))];
    pool.map(m => [editDistance(q, m.w), m] as const).filter(([d]) => d <= (q.length >= 7 ? 2 : 1)).sort((a, b) => a[0] - b[0]).slice(0, 3)
      .forEach(([, m]) => add({ ...m, note: 'did you mean this? ' + m.note }));
  }
  return res.slice(0, limit);
}
```

Also add `"resolveJsonModule": true` to `tsconfig.json`'s `compilerOptions` if it isn't there already.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/vocab.test.ts`
Expected: PASS. If `ALL_WORDS.length` isn't 242, stop: the extraction is wrong. Compare with `design/pinboard8-source/atlas-data.js`.

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-vocab.mjs src/vocab tests/vocab.test.ts tsconfig.json
git commit -m "feat: the full feelings vocabulary with everyday words and search"
```

---

### Task 4: Colour rules

**Files:**
- Create: `src/domain/colour.ts`
- Test: `tests/colour.test.ts`

**Interfaces:**
- Consumes: `Family`, `FAMILIES` from Task 3.
- Produces:
  - `type Theme = 'dark' | 'light'`
  - `LUMINOUS`, `PIGMENT: Record<Family | 'fog', string>`
  - `palette(theme: Theme): Record<Family | 'fog', string>` (Luminous in dark, Pigment in light)
  - `GROUND: Record<Theme, { base, ink, card, solid, muted, rule, line, tag, scrim: string }>`
  - `mix(a: string, b: string, t: number): string`
  - `contrast(a: string, b: string): number`
  - `onColor(c: string): string`
  - `solid(c: string): string`
  - `inkOf(c: string, base: string, dark: boolean): string`
  - `mixOk(cols: string[], weights: number[]): string`
  - `MARK_FAMILY: Record<'first'|'gift'|'priv'|'quiet', Family | 'fog'>`
  - `tagFamily(tag: string, history: Record<string, Family[]>, today: Family): Family`
  - `PERSON_THREADS: string[]`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { FAMILIES } from '../src/vocab/vocab';
import { GROUND, LUMINOUS, PIGMENT, contrast, inkOf, mixOk, onColor, palette, solid, tagFamily } from '../src/domain/colour';

describe('colour rules', () => {
  it('text on every feeling colour passes 4.5:1 once filled with solid()', () => {
    for (const P of [LUMINOUS, PIGMENT]) for (const f of FAMILIES) {
      const fill = solid(P[f]);
      expect(contrast(fill, onColor(fill))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('solid() leaves colours alone when they already pass', () => expect(solid('#FFC83D')).toBe('#ffc83d'));
  it('a colour used as text reaches 4.5:1 on both grounds', () => {
    for (const f of FAMILIES) {
      expect(contrast(inkOf(palette('dark')[f], GROUND.dark.base, true), GROUND.dark.base)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(inkOf(palette('light')[f], GROUND.light.base, false), GROUND.light.base)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('mixes pink and yellow into a vivid colour, not grey', () => {
    const m = mixOk(['#FF8FAE', '#FFC83D'], [1, 1]);
    const [r, g, b] = [1, 3, 5].map(i => parseInt(m.slice(i, i + 2), 16));
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(80);
  });
  it('a tag takes the feeling it most often comes with, or today’s when it has none', () => {
    expect(tagFamily('walk', { walk: ['warm', 'warm', 'bright'] }, 'calm')).toBe('warm');
    expect(tagFamily('new', {}, 'calm')).toBe('calm');
  });
});
```

Run: `npx vitest run tests/colour.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement**

Port these from `design/pinboard8-source/`:
- `srgb2lin`, `lin2srgb`, `toOklab`, `fromOklab` and `mixOk` from `p7-scenes2.js` lines 1–13 (typed, bodies unchanged);
- `hexToRgb`, `mix`, `lum`, `contrast`, `onColor` and `solid` from `p4-colour.js`.

The whole file:

```ts
import type { Family } from '../vocab/vocab';

export type Theme = 'dark' | 'light';
type Pal = Record<Family | 'fog', string>;
export const LUMINOUS: Pal = { bright: '#FFC83D', proud: '#FF9142', curious: '#9C8CFF', calm: '#56D6B8', warm: '#FF8FAE', wistful: '#B795CB', low: '#6F9BE8', tense: '#C9D84A', heated: '#FF5F57', fog: '#A9B4C2' };
export const PIGMENT: Pal = { bright: '#E9A23B', proud: '#D9692E', curious: '#6A5AA8', calm: '#5C9E8C', warm: '#D9777F', wistful: '#947393', low: '#4F6FA8', tense: '#A2A43F', heated: '#C4432F', fog: '#8A94A3' };
export const palette = (t: Theme): Pal => (t === 'dark' ? LUMINOUS : PIGMENT);
export const GROUND = {
  dark: { base: '#0F1317', ink: '#EEF2F5', card: 'rgba(22,28,35,.74)', solid: '#182028', muted: 'rgba(238,242,245,.8)', rule: 'rgba(238,242,245,.14)', line: 'rgba(238,242,245,.46)', tag: 'rgba(238,242,245,.14)', scrim: 'rgba(15,19,23,.8)' },
  light: { base: '#F2F4F3', ink: '#13171C', card: 'rgba(255,255,255,.84)', solid: '#FFFFFF', muted: 'rgba(19,23,28,.76)', rule: 'rgba(19,23,28,.12)', line: 'rgba(19,23,28,.52)', tag: 'rgba(19,23,28,.08)', scrim: 'rgba(246,247,246,.86)' },
} as const;
export const MARK_FAMILY = { first: 'bright', gift: 'warm', priv: 'calm', quiet: 'fog' } as const;
/* People get a soft, greyed thread colour, so a person never looks like a feeling. */
export const PERSON_THREADS = ['#B89A7A', '#8FA7B8', '#9DAE86', '#B395AE', '#8DAA9E', '#AE9F86', '#949FBA', '#B49A94'];

const hexToRgb = (h: string) => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
export const mix = (a: string, b: string, t: number) => { const x = hexToRgb(a), y = hexToRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const lum = (h: string) => { const [r, g, b] = hexToRgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/* Text on a coloured fill: whichever of white or near-black actually reads better. */
export const onColor = (c: string) => (contrast(c, '#FFFFFF') >= contrast(c, '#101820') ? '#FFFFFF' : '#101820');
/* A few mid-tones reach 4.5:1 with neither; when text sits on them the fill deepens a touch until it does. */
export function solid(c: string): string { let out = mix(c, c, 0), k = 0; while (Math.max(contrast(out, '#FFFFFF'), contrast(out, '#101820')) < 4.5 && k < 1) { k += 0.04; out = mix(c, '#101820', k); } return out; }
/* A colour used AS text: nudged towards the ink until it reaches 4.5:1 on the ground. */
export function inkOf(c: string, base: string, dark: boolean): string { const to = dark ? '#FFFFFF' : '#101820'; let out = c, k = 0; while (contrast(out, base) < 4.5 && k < 1) { k += 0.05; out = mix(c, to, k); } return out; }
/* Tags take the colour of the feeling they most often share a day with; a new tag borrows today's. */
export function tagFamily(tag: string, history: Record<string, Family[]>, today: Family): Family {
  const seen = history[tag]; if (!seen || !seen.length) return today;
  const n = new Map<Family, number>(); seen.forEach(f => n.set(f, (n.get(f) ?? 0) + 1));
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
/* OKLab mixing that keeps chroma, so pink and yellow meet in coral, not grey. Ported from design/pinboard8-source/p7-scenes2.js. */
const srgb2lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lin2srgb = (c: number) => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, v)) * 255); };
function toOklab(hex: string): [number, number, number] { const [r, g, b] = hexToRgb(hex).map(srgb2lin), l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; }
function fromOklab([L, A, B]: [number, number, number]): string { const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3), m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3), s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return '#' + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(v => lin2srgb(v).toString(16).padStart(2, '0')).join(''); }
export function mixOk(cols: string[], weights: number[]): string {
  let L = 0, A = 0, B = 0, C = 0, W = 0;
  cols.forEach((c, i) => { const [l, a, b] = toOklab(c), w = weights[i]; L += l * w; A += a * w; B += b * w; C += Math.hypot(a, b) * w; W += w; });
  L /= W; A /= W; B /= W; C /= W; const h = Math.atan2(B, A);
  return fromOklab([Math.min(0.97, L), Math.cos(h) * C, Math.sin(h) * C]);
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/colour.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 4: Commit**

```bash
git add src/domain/colour.ts tests/colour.test.ts
git commit -m "feat: colour rules (text on colour, text-safe shades, OKLab mixing, tag colours)"
```

---

### Task 5: Reading a line: tags, people and feelings

**Files:**
- Create: `src/domain/line.ts`
- Test: `tests/line.test.ts`

**Interfaces:**
- Consumes: `feelingOf`, `Family` (Task 3).
- Produces:
  - `interface Token { kind: 'tag'|'person'|'feeling'; raw: string; value: string; start: number; end: number }` (`value`: tag name in lower case, person initial in upper case, feeling word);
  - `tokenize(text: string): Token[]` (a `:` only counts at the start of a word, so `5:30` isn't a feeling);
  - `tokenAt(text: string, pos: number): Token | null`;
  - `tagsOf(text: string): string[]`, `peopleOf(text: string): string[]`;
  - `feelingsOf(text: string, own: Record<string,Family>): { w: string; family: Family }[]` (unique, in order, known words only);
  - `interface MomentDraft { word: string; family: Family; second?: Family; about?: string; strength: number }`;
  - `momentFromLine(found: { w: string; family: Family }[], recentWords: Set<string>): { moment: MomentDraft | null; skipped: string[] }`;
  - `removeFeelingToken(text: string, word: string): string`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { feelingsOf, momentFromLine, peopleOf, removeFeelingToken, tagsOf, tokenAt, tokenize } from '../src/domain/line';

const LINE = 'Long #walk with @r, felt :calm then :pooped at 5:30. #Chai :asdf';

describe('reading a line', () => {
  it('finds tags, people and feelings, but not times', () => {
    expect(tokenize(LINE).map(t => t.kind + ':' + t.value)).toEqual(['tag:walk', 'person:R', 'feeling:calm', 'feeling:pooped', 'tag:chai', 'feeling:asdf']);
    expect(tagsOf(LINE)).toEqual(['walk', 'chai']);
    expect(peopleOf(LINE)).toEqual(['R']);
  });
  it('keeps only feelings the vocabulary knows', () => {
    expect(feelingsOf(LINE, {})).toEqual([{ w: 'calm', family: 'calm' }, { w: 'pooped', family: 'low' }]);
  });
  it('finds the token under the caret', () => {
    const i = LINE.indexOf(':calm') + 2;
    expect(tokenAt(LINE, i)?.value).toBe('calm');
    expect(tokenAt(LINE, 0)).toBeNull();
  });
});

describe('feelings in a line become ONE moment', () => {
  it('leads with the first word, keeps a second family and lists the rest', () => {
    const r = momentFromLine([{ w: 'calm', family: 'calm' }, { w: 'pooped', family: 'low' }, { w: 'content', family: 'calm' }], new Set());
    expect(r.moment).toEqual({ word: 'calm', family: 'calm', second: 'low', about: 'then pooped, content', strength: 3 });
  });
  it('skips words already logged in the last hour', () => {
    const r = momentFromLine([{ w: 'calm', family: 'calm' }], new Set(['calm']));
    expect(r.moment).toBeNull();
    expect(r.skipped).toEqual(['calm']);
  });
  it('makes nothing from a line with no feelings', () => expect(momentFromLine([], new Set()).moment).toBeNull());
});

describe('removing a feeling from a line', () => {
  it('takes out the word and tidies spaces and punctuation', () => {
    expect(removeFeelingToken('Felt :calm, then :pooped.', 'calm')).toBe('Felt, then :pooped.');
    expect(removeFeelingToken('hi :calm and more', 'calm')).toBe('hi and more');
    expect(removeFeelingToken(':mood-off today', 'mood off')).toBe('today');
  });
  it('leaves the line alone when the word is not there', () => expect(removeFeelingToken('hi :calm', 'tense')).toBe('hi :calm'));
});
```

Run: `npx vitest run tests/line.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement**

```ts
import { feelingOf, type Family } from '../vocab/vocab';

export interface Token { kind: 'tag' | 'person' | 'feeling'; raw: string; value: string; start: number; end: number }
export interface MomentDraft { word: string; family: Family; second?: Family; about?: string; strength: number }
/* # tags, @ people, and : feelings (a colon only at the start of a word, so times like 5:30 don't count) */
const TOKEN_RE = /(#[\p{L}\p{N}_-]+)|(@[A-Za-z]+)|((?<=^|\s):[\p{L}][\p{L}'-]*)/gu;

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const raw = m[0], start = m.index ?? 0, end = start + raw.length;
    if (m[1]) out.push({ kind: 'tag', raw, value: raw.slice(1).toLowerCase(), start, end });
    else if (m[2]) out.push({ kind: 'person', raw, value: raw.slice(1).toUpperCase(), start, end });
    else out.push({ kind: 'feeling', raw, value: raw.slice(1).toLowerCase().replace(/-/g, ' '), start, end });
  }
  return out;
}
export const tokenAt = (text: string, pos: number) => tokenize(text).find(t => pos > t.start && pos <= t.end) ?? null;
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
export const tagsOf = (text: string) => uniq(tokenize(text).filter(t => t.kind === 'tag').map(t => t.value));
export const peopleOf = (text: string) => uniq(tokenize(text).filter(t => t.kind === 'person').map(t => t.value));
export function feelingsOf(text: string, own: Record<string, Family>): { w: string; family: Family }[] {
  const seen = new Set<string>(), out: { w: string; family: Family }[] = [];
  tokenize(text).filter(t => t.kind === 'feeling').forEach(t => { const x = feelingOf(t.value, own); if (x && !seen.has(x.w)) { seen.add(x.w); out.push(x); } });
  return out;
}
export function momentFromLine(found: { w: string; family: Family }[], recentWords: Set<string>): { moment: MomentDraft | null; skipped: string[] } {
  const skipped = found.filter(x => recentWords.has(x.w)).map(x => x.w);
  const fresh = found.filter(x => !recentWords.has(x.w));
  if (!fresh.length) return { moment: null, skipped };
  const lead = fresh[0], second = fresh.find(x => x.family !== lead.family)?.family, rest = fresh.slice(1).map(x => x.w);
  const moment: MomentDraft = { word: lead.w, family: lead.family, strength: 3 };
  if (second) moment.second = second;
  if (rest.length) moment.about = 'then ' + rest.join(', ');
  return { moment, skipped };
}
export function removeFeelingToken(text: string, word: string): string {
  const t = tokenize(text).find(x => x.kind === 'feeling' && x.value === word.toLowerCase());
  if (!t) return text;
  return (text.slice(0, t.start) + text.slice(t.end)).replace(/\s+([,.;!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/line.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 4: Commit**

```bash
git add src/domain/line.ts tests/line.test.ts
git commit -m "feat: read tags, people and feelings from a line; merge feelings into one moment"
```

---

### Task 6: The database and the actions (Keep, Undo, Remove)

**Files:**
- Create: `src/db/types.ts`, `src/db/db.ts`, `src/db/actions.ts`
- Test: `tests/actions.test.ts`

**Interfaces:**
- Consumes: `dayKey`, `timeZone`, `timeLabel` (Task 2); `feelingsOf`, `momentFromLine`, `removeFeelingToken`, `tagsOf`, `peopleOf` (Task 5); `Family` (Task 3).
- Produces:
  - Types (`types.ts`):
    - `Marks = { first?: boolean; gift?: boolean; priv?: boolean; quiet?: boolean }`
    - `Entry = { id?: number; day: string; at: number; tz: string; kind: 'line'; text: string; marks: Marks; tags: string[]; people: string[]; writtenAt: number }`
    - `Moment = { id?: number; day: string; at: number; word: string; family: Family; second?: Family; about?: string; strength: number; entryId?: number }`
    - `DayRow = { day: string; overall?: { word: string; family: Family; strength: number; set: boolean }; grateful?: string }`
    - `Person = { id: string; initial: string; name: string; thread: number; birthday?: string }`
    - `OwnWord = { word: string; family: Family; created: number }`
    - `Settings = { id: 'main'; voice: number; dayStyle: 'bloom' | 'score'; theme: 'dark' | 'light'; motion: 'still' | 'gentle' | 'lively'; homes: { name: string; lat: number; lon: number; from: string; to?: string }[]; starterLoaded: boolean; lastExport?: number }`
    - `DEFAULT_SETTINGS: Settings`
  - `db.ts`: `class LogbookDb extends Dexie` with tables `entries, moments, days, people, words, settings, photos, places, spans, postcards, tags`; `openDb(name = 'logbook'): LogbookDb`; `db` (the app's instance).
  - `actions.ts`:
    - `interface Undo { label: string; run: () => Promise<void> }`
    - `class StorageFullError extends Error`
    - `keepLine(db, { text, marks, at }: { text: string; marks: Marks; at: Date }, own: Record<string,Family>): Promise<{ entryId: number; momentId: number | null; skipped: string[]; undo: Undo }>`
    - `keepMoment(db, draft: MomentDraft & { at: Date }): Promise<{ momentId: number; undo: Undo }>`
    - `setOverall(db, day: string, overall: { word: string; family: Family; strength: number }): Promise<Undo>`
    - `confirmOverall(db, day: string, suggested: { word: string; family: Family; strength: number }): Promise<Undo>`
    - `removeFeelingFromEntry(db, entryId: number, word: string): Promise<Undo>`
    - `removeMoment(db, momentId: number): Promise<Undo>`
    - `removeEntry(db, entryId: number): Promise<Undo>`
    - `addOwnWord(db, word: string, family: Family): Promise<void>`
    - `getSettings(db): Promise<Settings>`, `saveSettings(db, patch: Partial<Settings>): Promise<void>`

- [ ] **Step 1: Write types.ts and db.ts**

`src/db/types.ts`:
```ts
import type { Family } from '../vocab/vocab';
export type Marks = { first?: boolean; gift?: boolean; priv?: boolean; quiet?: boolean };
export type Entry = { id?: number; day: string; at: number; tz: string; kind: 'line'; text: string; marks: Marks; tags: string[]; people: string[]; writtenAt: number };
export type Moment = { id?: number; day: string; at: number; word: string; family: Family; second?: Family; about?: string; strength: number; entryId?: number };
export type DayRow = { day: string; overall?: { word: string; family: Family; strength: number; set: boolean }; grateful?: string };
export type Person = { id: string; initial: string; name: string; thread: number; birthday?: string };
export type OwnWord = { word: string; family: Family; created: number };
export type Settings = { id: 'main'; voice: number; dayStyle: 'bloom' | 'score'; theme: 'dark' | 'light'; motion: 'still' | 'gentle' | 'lively'; homes: { name: string; lat: number; lon: number; from: string; to?: string }[]; starterLoaded: boolean; lastExport?: number };
export const DEFAULT_SETTINGS: Settings = { id: 'main', voice: 0, dayStyle: 'bloom', theme: 'dark', motion: 'gentle', homes: [], starterLoaded: false };
```

`src/db/db.ts`:
```ts
import Dexie, { type Table } from 'dexie';
import type { DayRow, Entry, Moment, OwnWord, Person, Settings } from './types';

/* Version 1 holds every table the spec names, so later stages add data, not migrations. */
export class LogbookDb extends Dexie {
  entries!: Table<Entry, number>;
  moments!: Table<Moment, number>;
  days!: Table<DayRow, string>;
  people!: Table<Person, string>;
  words!: Table<OwnWord, string>;
  settings!: Table<Settings, string>;
  photos!: Table<{ id?: number; day: string; blob: Blob; thumb: Blob; takenAt?: number }, number>;
  places!: Table<{ id?: number; name: string; lat: number; lon: number; first: boolean; visits: number }, number>;
  spans!: Table<{ id?: number; name: string; from: string; to: string; family: string }, number>;
  postcards!: Table<{ id: string; app: string; day: string; version: number; data: unknown; receivedAt: number }, string>;
  tags!: Table<{ name: string; created: number }, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      entries: '++id, day, at, *tags, *people',
      moments: '++id, day, at, entryId, family',
      days: 'day',
      people: 'id',
      words: 'word',
      settings: 'id',
      photos: '++id, day',
      places: '++id, name',
      spans: '++id, from, to',
      postcards: 'id, app, day',
      tags: 'name',
    });
  }
}
export const openDb = (name = 'logbook') => new LogbookDb(name);
export const db = openDb();
```

- [ ] **Step 2: Write the failing tests**

`tests/actions.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { StorageFullError, confirmOverall, keepLine, keepMoment, removeEntry, removeFeelingFromEntry, removeMoment, setOverall } from '../src/db/actions';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('test-' + n++); await db.open(); });
const at = (s: string) => new Date(s);

describe('keeping a line', () => {
  it('saves the entry with tags, people and one merged moment', async () => {
    const r = await keepLine(db, { text: 'Walk with @r, :calm then :pooped #walk', marks: { first: true }, at: at('2026-09-29T23:24:00') }, {});
    const e = await db.entries.get(r.entryId);
    expect(e).toMatchObject({ day: '2026-09-29', tags: ['walk'], people: ['R'], marks: { first: true } });
    const ms = await db.moments.toArray();
    expect(ms).toHaveLength(1);
    expect(ms[0]).toMatchObject({ word: 'calm', second: 'low', about: 'then pooped', entryId: r.entryId, day: '2026-09-29' });
  });
  it('files a line kept at 00:30 under the day before', async () => {
    const r = await keepLine(db, { text: 'late', marks: {}, at: at('2026-09-30T00:30:00') }, {});
    expect((await db.entries.get(r.entryId))?.day).toBe('2026-09-29');
  });
  it('does not log a feeling twice within the hour', async () => {
    await keepLine(db, { text: ':calm', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    const r = await keepLine(db, { text: 'again :calm', marks: {}, at: at('2026-09-29T22:40:00') }, {});
    expect(r.skipped).toEqual(['calm']);
    expect(await db.moments.count()).toBe(1);
  });
  it('an unknown :word stays text and makes no moment', async () => {
    await keepLine(db, { text: 'hmm :asdf', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    expect(await db.moments.count()).toBe(0);
  });
  it('Undo removes exactly what was kept, and a second Undo does nothing', async () => {
    await keepLine(db, { text: 'earlier :content', marks: {}, at: at('2026-09-29T09:00:00') }, {});
    const r = await keepLine(db, { text: 'now :calm', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    await r.undo.run();
    await r.undo.run();
    expect(await db.entries.count()).toBe(1);
    expect((await db.moments.toArray()).map(m => m.word)).toEqual(['content']);
  });
  it('reports storage full without saving half an entry', async () => {
    const real = db.moments.add.bind(db.moments);
    db.moments.add = (() => Promise.reject(Object.assign(new Error('full'), { name: 'QuotaExceededError' }))) as typeof db.moments.add;
    await expect(keepLine(db, { text: 'x :calm', marks: {}, at: at('2026-09-29T22:00:00') }, {})).rejects.toBeInstanceOf(StorageFullError);
    db.moments.add = real;
    expect(await db.entries.count()).toBe(0);
  });
});

describe('moments, the day overall and removing', () => {
  it('keeps a moment and undoes it', async () => {
    const r = await keepMoment(db, { word: 'nostalgic', family: 'wistful', strength: 3, at: at('2026-09-29T23:30:00') });
    expect(await db.moments.count()).toBe(1);
    await r.undo.run();
    expect(await db.moments.count()).toBe(0);
  });
  it('sets and confirms the day overall, with Undo restoring the previous one', async () => {
    await confirmOverall(db, '2026-09-29', { word: 'close', family: 'warm', strength: 4 });
    const u = await setOverall(db, '2026-09-29', { word: 'nostalgic', family: 'wistful', strength: 3 });
    expect((await db.days.get('2026-09-29'))?.overall).toMatchObject({ word: 'nostalgic', set: true });
    await u.run();
    expect((await db.days.get('2026-09-29'))?.overall).toMatchObject({ word: 'close', set: true });
  });
  it('removes one feeling from an entry and its moment, and Undo restores both', async () => {
    const r = await keepLine(db, { text: 'felt :calm then :pooped.', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    const u = await removeFeelingFromEntry(db, r.entryId, 'calm');
    expect((await db.entries.get(r.entryId))?.text).toBe('felt then :pooped.');
    expect((await db.moments.toArray())[0]).toMatchObject({ word: 'pooped', family: 'low' });
    await u.run();
    expect((await db.entries.get(r.entryId))?.text).toBe('felt :calm then :pooped.');
    expect((await db.moments.toArray())[0]).toMatchObject({ word: 'calm', about: 'then pooped' });
  });
  it('removes a moment and a whole entry with Undo', async () => {
    const r = await keepLine(db, { text: 'x :calm', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    const m = (await db.moments.toArray())[0];
    const u1 = await removeMoment(db, m.id!); expect(await db.moments.count()).toBe(0); await u1.run(); expect(await db.moments.count()).toBe(1);
    const u2 = await removeEntry(db, r.entryId); expect(await db.entries.count()).toBe(0); expect(await db.moments.count()).toBe(0);
    await u2.run(); expect(await db.entries.count()).toBe(1); expect(await db.moments.count()).toBe(1);
  });
});
```

Run: `npx vitest run tests/actions.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement actions.ts**

```ts
import type { Family } from '../vocab/vocab';
import { dayKey, timeZone } from '../domain/day';
import { feelingsOf, momentFromLine, peopleOf, removeFeelingToken, tagsOf, type MomentDraft } from '../domain/line';
import type { LogbookDb } from './db';
import { DEFAULT_SETTINGS, type Entry, type Marks, type Moment, type Settings } from './types';

export interface Undo { label: string; run: () => Promise<void> }
export class StorageFullError extends Error { constructor() { super('The phone is out of space. Nothing was saved, and your words are still in the box.'); this.name = 'StorageFullError'; } }
const HOUR = 3600_000;
/* Runs a write; a full disk becomes StorageFullError. Dexie transactions roll back, so nothing half-saves. */
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (e) {
    const name = (e as { name?: string; inner?: { name?: string } }).name ?? '';
    const inner = (e as { inner?: { name?: string } }).inner?.name ?? '';
    if (name === 'QuotaExceededError' || inner === 'QuotaExceededError') throw new StorageFullError();
    throw e;
  }
}
/* An Undo runs at most once. */
function once(label: string, fn: () => Promise<void>): Undo { let done = false; return { label, run: async () => { if (done) return; done = true; await fn(); } }; }

export async function keepLine(db: LogbookDb, { text, marks, at }: { text: string; marks: Marks; at: Date }, own: Record<string, Family>) {
  const clean = text.trim();
  const day = dayKey(at), t = at.getTime();
  const recent = new Set((await db.moments.where('at').between(t - HOUR, t + 1).toArray()).map(m => m.word));
  const { moment, skipped } = momentFromLine(feelingsOf(clean, own), recent);
  return guard(() => db.transaction('rw', db.entries, db.moments, db.tags, async () => {
    const entry: Entry = { day, at: t, tz: timeZone(), kind: 'line', text: clean, marks: { ...marks }, tags: tagsOf(clean), people: peopleOf(clean), writtenAt: Date.now() };
    const entryId = await db.entries.add(entry);
    for (const name of entry.tags) if (!(await db.tags.get(name))) await db.tags.add({ name, created: t });
    const momentId = moment ? await db.moments.add({ ...moment, day, at: t, entryId }) : null;
    return { entryId, momentId, skipped, undo: once('Kept', async () => { await db.transaction('rw', db.entries, db.moments, async () => { await db.entries.delete(entryId); await db.moments.where('entryId').equals(entryId).delete(); }); }) };
  }));
}
export async function keepMoment(db: LogbookDb, d: MomentDraft & { at: Date }) {
  const m: Moment = { word: d.word, family: d.family, strength: d.strength, day: dayKey(d.at), at: d.at.getTime() };
  if (d.second) m.second = d.second;
  if (d.about) m.about = d.about;
  const momentId = await guard(() => db.moments.add(m));
  return { momentId, undo: once(`Kept ${d.word}`, () => db.moments.delete(momentId)) };
}
async function writeOverall(db: LogbookDb, day: string, overall: { word: string; family: Family; strength: number }): Promise<Undo> {
  const before = await db.days.get(day);
  await guard(() => db.days.put({ ...(before ?? { day }), overall: { ...overall, set: true } }));
  return once('The day overall', async () => { if (before) await db.days.put(before); else await db.days.delete(day); });
}
export const setOverall = writeOverall;
export const confirmOverall = writeOverall;
export async function removeFeelingFromEntry(db: LogbookDb, entryId: number, word: string): Promise<Undo> {
  const e = await db.entries.get(entryId); if (!e) return once('Nothing', async () => {});
  const moments = await db.moments.where('entryId').equals(entryId).toArray();
  await db.transaction('rw', db.entries, db.moments, async () => {
    await db.entries.update(entryId, { text: removeFeelingToken(e.text, word) });
    for (const m of moments) {
      const words = [m.word, ...(m.about ? m.about.replace(/^then /, '').split(', ') : [])].filter(w => w !== word);
      if (!words.length) { await db.moments.delete(m.id!); continue; }
      const { moment } = momentFromLine(words.map(w => ({ w, family: w === m.word ? m.family : (m.second ?? m.family) })), new Set());
      await db.moments.put({ ...m, word: moment!.word, family: moment!.family, second: moment!.second, about: moment!.about });
    }
  });
  return once(`Removed ${word}`, async () => { await db.transaction('rw', db.entries, db.moments, async () => { await db.entries.put(e); for (const m of moments) await db.moments.put(m); }); });
}
export async function removeMoment(db: LogbookDb, momentId: number): Promise<Undo> {
  const m = await db.moments.get(momentId); await db.moments.delete(momentId);
  return once(`Removed ${m?.word ?? ''}`, async () => { if (m) await db.moments.put(m); });
}
export async function removeEntry(db: LogbookDb, entryId: number): Promise<Undo> {
  const e = await db.entries.get(entryId), ms = await db.moments.where('entryId').equals(entryId).toArray();
  await db.transaction('rw', db.entries, db.moments, async () => { await db.entries.delete(entryId); await db.moments.where('entryId').equals(entryId).delete(); });
  return once('Removed', async () => { await db.transaction('rw', db.entries, db.moments, async () => { if (e) await db.entries.put(e); for (const m of ms) await db.moments.put(m); }); });
}
export async function addOwnWord(db: LogbookDb, word: string, family: Family) { await guard(() => db.words.put({ word: word.trim().toLowerCase(), family, created: Date.now() })); }
export async function getSettings(db: LogbookDb): Promise<Settings> { return (await db.settings.get('main')) ?? DEFAULT_SETTINGS; }
export async function saveSettings(db: LogbookDb, patch: Partial<Settings>) { await db.settings.put({ ...(await getSettings(db)), ...patch, id: 'main' }); }
```

Known subtlety for the removal test: a second family survives only when a remaining word belongs to it. `momentFromLine` recomputes `second` from what's left, and the test checks that.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/actions.test.ts`
Expected: PASS, 10 tests. If the storage-full test fails because Dexie wraps the error, check `e.inner.name` in `guard` (already handled) and rerun.

- [ ] **Step 5: Commit**

```bash
git add src/db tests/actions.test.ts
git commit -m "feat: the logbook database, and Keep, Undo and Remove actions"
```

---

### Task 7: Export as Markdown, and the JSON backup

**Files:**
- Create: `src/domain/markdown.ts`, `src/domain/zip.ts`, `src/db/exportMarkdown.ts`, `src/db/backup.ts`
- Test: `tests/export.test.ts`

**Interfaces:**
- Consumes: the db and types (Task 6), `ladderName`/`FAMILY_NAME` (Task 3), `timeLabel` (Task 2).
- Produces:
  - `dayToMarkdown(day: string, row: DayRow | undefined, entries: Entry[], moments: Moment[]): string`
  - `crc32(bytes: Uint8Array): number`
  - `makeZip(files: { path: string; data: Uint8Array | string }[]): Blob`
  - `makeMarkdownZip(db): Promise<Blob>` (files `YYYY/MM/YYYY-MM-DD.md` plus `README.md`)
  - `interface Backup { format: 'logbook-backup'; version: 1; exportedAt: string; tables: Record<string, unknown[]> }`
  - `makeBackup(db): Promise<Backup>`
  - `restoreBackup(db, data: unknown): Promise<void>` (throws `BackupError` with a plain message)
  - `class BackupError extends Error`

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepLine, setOverall } from '../src/db/actions';
import { dayToMarkdown } from '../src/domain/markdown';
import { crc32, makeZip } from '../src/domain/zip';
import { makeMarkdownZip } from '../src/db/exportMarkdown';
import { BackupError, makeBackup, restoreBackup } from '../src/db/backup';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('exp-' + n++); await db.open(); });

describe('Markdown', () => {
  it('writes a readable day with front matter, times, words and marks', () => {
    const md = dayToMarkdown('2026-09-29', { day: '2026-09-29', overall: { word: 'close', family: 'warm', strength: 4, set: true } },
      [{ id: 1, day: '2026-09-29', at: new Date('2026-09-29T23:24:00').getTime(), tz: 'Asia/Kolkata', kind: 'line', text: 'A "quoted" line: with --- dashes #walk :calm', marks: { first: true, priv: true }, tags: ['walk'], people: [], writtenAt: 0 }],
      [{ id: 1, day: '2026-09-29', at: new Date('2026-09-29T23:24:00').getTime(), word: 'calm', family: 'calm', strength: 3 }]);
    expect(md).toContain('---\ndate: 2026-09-29\n');
    expect(md).toContain('overall: "close (Warm, Sunset glow)"');
    expect(md).toContain('## 11:24 pm');
    expect(md).toContain('A "quoted" line: with --- dashes #walk :calm');
    expect(md).toContain('Marks: first, private');
    expect(md).toContain('- 11:24 pm, calm (Calm, Still air)');
  });
});

describe('zip', () => {
  it('computes the standard CRC-32', () => expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926'));
  it('writes a readable zip with the right entries', async () => {
    const bytes = new Uint8Array(await makeZip([{ path: 'a/b.md', data: 'hi' }]).arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(new TextDecoder().decode(bytes)).toContain('a/b.md');
  });
  it('exports every day into its month folder', async () => {
    await keepLine(db, { text: 'first line', marks: {}, at: new Date('2026-09-29T10:00:00') }, {});
    const text = new TextDecoder().decode(new Uint8Array(await (await makeMarkdownZip(db)).arrayBuffer()));
    expect(text).toContain('2026/09/2026-09-29.md');
    expect(text).toContain('first line');
  });
});

describe('backup', () => {
  it('round-trips everything', async () => {
    await keepLine(db, { text: 'keep :calm', marks: { gift: true }, at: new Date('2026-09-29T10:00:00') }, {});
    await setOverall(db, '2026-09-29', { word: 'calm', family: 'calm', strength: 3 });
    const b = await makeBackup(db);
    const other = openDb('exp-restore-' + n++); await other.open();
    await restoreBackup(other, JSON.parse(JSON.stringify(b)));
    expect(await other.entries.count()).toBe(1);
    expect((await other.days.get('2026-09-29'))?.overall?.word).toBe('calm');
  });
  it('refuses a file that is not a Logbook backup, and writes nothing', async () => {
    await expect(restoreBackup(db, { hello: 1 })).rejects.toBeInstanceOf(BackupError);
    expect(await db.entries.count()).toBe(0);
  });
});
```

Run: `npx vitest run tests/export.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement markdown.ts**

```ts
import type { DayRow, Entry, Moment } from '../db/types';
import { FAMILY_NAME, ladderName } from '../vocab/vocab';
import { timeLabel } from './day';

const MARK_WORD = { first: 'first', gift: 'gift', priv: 'private', quiet: 'don’t bring back' } as const;
const q = (s: string) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
/* One day as a plain Markdown file anyone can read in ten years: front matter, then entries and feelings in time order. */
export function dayToMarkdown(day: string, row: DayRow | undefined, entries: Entry[], moments: Moment[]): string {
  const fm = ['---', `date: ${day}`];
  if (row?.overall) fm.push(`overall: ${q(`${row.overall.word} (${FAMILY_NAME[row.overall.family]}, ${ladderName(row.overall.family, row.overall.strength)})`)}`);
  const tags = [...new Set(entries.flatMap(e => e.tags))], people = [...new Set(entries.flatMap(e => e.people))];
  if (tags.length) fm.push(`tags: [${tags.map(q).join(', ')}]`);
  if (people.length) fm.push(`people: [${people.map(q).join(', ')}]`);
  fm.push('---', '');
  const body: string[] = [];
  [...entries].sort((a, b) => a.at - b.at).forEach(e => {
    body.push(`## ${timeLabel(new Date(e.at))}`, '', e.text, '');
    const marks = (Object.keys(MARK_WORD) as (keyof typeof MARK_WORD)[]).filter(k => e.marks[k]).map(k => MARK_WORD[k]);
    if (marks.length) body.push(`Marks: ${marks.join(', ')}`, '');
  });
  if (moments.length) {
    body.push('## Feelings', '');
    [...moments].sort((a, b) => a.at - b.at).forEach(m => body.push(`- ${timeLabel(new Date(m.at))}, ${m.word} (${FAMILY_NAME[m.family]}, ${ladderName(m.family, m.strength)})${m.second ? `, with ${FAMILY_NAME[m.second].toLowerCase()}` : ''}${m.about ? `, ${m.about}` : ''}`));
    body.push('');
  }
  if (row?.grateful) body.push('## Grateful for', '', row.grateful, '');
  return fm.join('\n') + body.join('\n');
}
```

- [ ] **Step 3: Implement zip.ts**

This writes stored entries, so there's no compression and no dependency.

```ts
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(bytes: Uint8Array): number { let c = 0xffffffff; for (const b of bytes) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export function makeZip(files: { path: string; data: Uint8Array | string }[]): Blob {
  const enc = new TextEncoder(), parts: Uint8Array[] = [], central: Uint8Array[] = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.path), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true); head.setUint16(8, 0, true);
    head.setUint32(14, crc, true); head.setUint32(18, data.length, true); head.setUint32(22, data.length, true); head.setUint16(26, name.length, true);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true);
    cd.setUint32(16, crc, true); cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, name.length, true); cd.setUint32(42, offset, true);
    parts.push(new Uint8Array(head.buffer), name, data); central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
```

- [ ] **Step 4: Implement exportMarkdown.ts and backup.ts**

`src/db/exportMarkdown.ts`:
```ts
import type { LogbookDb } from './db';
import { dayToMarkdown } from '../domain/markdown';
import { makeZip } from '../domain/zip';

const README = '# Logbook export\n\nOne Markdown file per day, in year and month folders. Open them with any text editor.\n';
export async function makeMarkdownZip(db: LogbookDb): Promise<Blob> {
  const [entries, moments, days] = await Promise.all([db.entries.toArray(), db.moments.toArray(), db.days.toArray()]);
  const keys = [...new Set([...entries.map(e => e.day), ...moments.map(m => m.day), ...days.map(d => d.day)])].sort();
  const files = keys.map(k => ({ path: `${k.slice(0, 4)}/${k.slice(5, 7)}/${k}.md`, data: dayToMarkdown(k, days.find(d => d.day === k), entries.filter(e => e.day === k), moments.filter(m => m.day === k)) }));
  return makeZip([{ path: 'README.md', data: README }, ...files]);
}
```

`src/db/backup.ts`:
```ts
import type { LogbookDb } from './db';

export class BackupError extends Error { constructor(msg: string) { super(msg); this.name = 'BackupError'; } }
export interface Backup { format: 'logbook-backup'; version: 1; exportedAt: string; tables: Record<string, unknown[]> }
/* Stage 1 has no photos; when they arrive (Stage 2) their blobs are written as data URLs here. */
const TABLES = ['entries', 'moments', 'days', 'people', 'words', 'settings', 'places', 'spans', 'postcards', 'tags'] as const;
export async function makeBackup(db: LogbookDb): Promise<Backup> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await db.table(t).toArray();
  return { format: 'logbook-backup', version: 1, exportedAt: new Date().toISOString(), tables };
}
export async function restoreBackup(db: LogbookDb, data: unknown): Promise<void> {
  const b = data as Partial<Backup>;
  if (!b || b.format !== 'logbook-backup' || b.version !== 1 || typeof b.tables !== 'object' || !b.tables) throw new BackupError('This file isn’t a Logbook backup. Nothing was changed.');
  await db.transaction('rw', TABLES.map(t => db.table(t)), async () => {
    for (const t of TABLES) { await db.table(t).clear(); const rows = b.tables![t]; if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows); }
  });
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/export.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/domain/markdown.ts src/domain/zip.ts src/db/exportMarkdown.ts src/db/backup.ts tests/export.test.ts
git commit -m "feat: export days as Markdown in a zip, and a full JSON backup with restore"
```

---

### Task 8: The private starter file

**Files:**
- Create: `src/db/starter.ts`, `private/README.md` (git-ignored; never committed), `tests/fixtures/starter.example.json`
- Test: `tests/starter.test.ts`

**Interfaces:**
- Consumes: db, `saveSettings` (Task 6).
- Produces:
  - `interface Starter { format: 'logbook-starter'; version: 1; people: { id: string; initial: string; name: string; birthday?: string; thread?: number }[]; homes: { name: string; lat: number; lon: number; from: string; to?: string }[]; lastfm?: string[]; googleClientId?: string }`
  - `class StarterError extends Error`
  - `parseStarter(text: string): Starter`
  - `applyStarter(db, s: Starter): Promise<void>`

- [ ] **Step 1: Write the fixture and failing tests**

`tests/fixtures/starter.example.json` holds made-up data only:
```json
{ "format": "logbook-starter", "version": 1,
  "people": [{ "id": "a", "initial": "A", "name": "Friend A", "birthday": "10-11" }, { "id": "r", "initial": "R", "name": "Friend R" }],
  "homes": [{ "name": "Home 1", "lat": 28.6, "lon": 77.2, "from": "2019-01-01", "to": "2025-01-01" }, { "name": "Home 2", "lat": 28.7, "lon": 77.1, "from": "2025-01-01" }] }
```

`tests/starter.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { StarterError, applyStarter, parseStarter } from '../src/db/starter';
import { getSettings } from '../src/db/actions';

const example = readFileSync('tests/fixtures/starter.example.json', 'utf8');
let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('st-' + n++); await db.open(); });

describe('starter file', () => {
  it('loads people and homes, and gives each person a thread colour', async () => {
    await applyStarter(db, parseStarter(example));
    expect(await db.people.count()).toBe(2);
    expect((await db.people.get('r'))?.thread).toBe(1);
    const s = await getSettings(db);
    expect(s.homes).toHaveLength(2);
    expect(s.starterLoaded).toBe(true);
  });
  it.each([
    ['not JSON', 'nope{', 'isn’t readable'],
    ['the wrong kind of file', '{"format":"health-starter"}', 'isn’t a Logbook starter file'],
    ['a person with no initial', '{"format":"logbook-starter","version":1,"people":[{"id":"x","name":"X"}],"homes":[]}', 'person 1 has no initial'],
  ])('refuses %s with a plain message and writes nothing', async (_, text, msg) => {
    expect(() => parseStarter(text)).toThrow(StarterError);
    expect(() => parseStarter(text)).toThrow(msg);
    expect(await db.people.count()).toBe(0);
  });
});
```

Run: `npx vitest run tests/starter.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement starter.ts**

```ts
import type { LogbookDb } from './db';
import { saveSettings } from './actions';

export class StarterError extends Error { constructor(msg: string) { super(msg); this.name = 'StarterError'; } }
export interface Starter { format: 'logbook-starter'; version: 1; people: { id: string; initial: string; name: string; birthday?: string; thread?: number }[]; homes: { name: string; lat: number; lon: number; from: string; to?: string }[]; lastfm?: string[]; googleClientId?: string }

export function parseStarter(text: string): Starter {
  let s: Partial<Starter>;
  try { s = JSON.parse(text); } catch { throw new StarterError('This file isn’t readable. Nothing was changed.'); }
  if (!s || s.format !== 'logbook-starter') throw new StarterError('This isn’t a Logbook starter file. Nothing was changed.');
  const people = Array.isArray(s.people) ? s.people : [], homes = Array.isArray(s.homes) ? s.homes : [];
  people.forEach((p, i) => {
    if (!p || !p.id) throw new StarterError(`In the starter file, person ${i + 1} has no id. Nothing was changed.`);
    if (!p.initial) throw new StarterError(`In the starter file, person ${i + 1} has no initial. Nothing was changed.`);
  });
  homes.forEach((h, i) => { if (!h || !h.name || typeof h.lat !== 'number' || typeof h.lon !== 'number' || !h.from) throw new StarterError(`In the starter file, home ${i + 1} needs a name, lat, lon and from. Nothing was changed.`); });
  return { format: 'logbook-starter', version: 1, people, homes, lastfm: s.lastfm, googleClientId: s.googleClientId };
}
export async function applyStarter(db: LogbookDb, s: Starter): Promise<void> {
  await db.transaction('rw', db.people, db.settings, async () => {
    await db.people.bulkPut(s.people.map((p, i) => ({ id: p.id, initial: p.initial.toUpperCase().slice(0, 1), name: p.name, birthday: p.birthday, thread: p.thread ?? i })));
    await saveSettings(db, { homes: s.homes, starterLoaded: true });
  });
}
```

`private/README.md` (git-ignored; a reminder for the owner):
```markdown
Put logbook-starter.json here. It holds real names, homes and keys and must never be committed.
Shape: see tests/fixtures/starter.example.json in the repo (made-up data).
```

- [ ] **Step 3: Run tests and confirm private/ is ignored**

Run: `npx vitest run tests/starter.test.ts && git status --short private`
Expected: tests PASS, and `git status` prints nothing for `private/`.

- [ ] **Step 4: Commit**

```bash
git add src/db/starter.ts tests/starter.test.ts tests/fixtures/starter.example.json
git commit -m "feat: load the private starter file with plain error messages"
```

---

### Task 9: The drawings (feeling forms, Bloom and Score)

**Files:**
- Create: `src/draw/forms.ts`, `src/draw/day.ts`, `src/draw/Canvas.tsx`, `tests/draw.test.ts`

**Interfaces:**
- Consumes: `palette`, `GROUND`, `mix`, `mixOk`, `Theme` (Task 4); `Family`, `FAMILIES` (Task 3).
- Produces:
  - `interface Look { theme: Theme; pal: Record<Family|'fog', string>; ground: (typeof GROUND)['dark'] }`, and `lookOf(theme: Theme): Look`
  - `drawForm(ctx: CanvasRenderingContext2D, look: Look, fam: Family, x: number, y: number, r: number, t: number, fam2?: Family): void` (Lines form; switches to the still silhouette when `r < 13`)
  - `drawSmall(ctx, look, fam, x, y, r): void`
  - `interface DayMoment { h: number; family: Family; second?: Family; strength: number }` (`h` = hour of day, 0–24)
  - `drawBloomLine(ctx, look, w, h, t, moments: DayMoment[], overall: Family): void`
  - `drawScoreLine(ctx, look, w, h, t, moments: DayMoment[]): void`
  - `<Scene draw={(ctx, w, h, t) => void} animate?: boolean label: string className?: string />`: a canvas that sizes itself to CSS pixels × devicePixelRatio (max 2), redraws on resize, and joins one shared animation loop when `animate` is true. `motion: 'still'` or `prefers-reduced-motion` draws one frame at `t = 0`.

- [ ] **Step 1: Write the failing test**

A mock canvas records calls and rejects NaN or Infinity, the way the pinboard smoke test did.

```ts
import { describe, expect, it } from 'vitest';
import { FAMILIES } from '../src/vocab/vocab';
import { drawForm, drawSmall, lookOf } from '../src/draw/forms';
import { drawBloomLine, drawScoreLine } from '../src/draw/day';

const grad = { addColorStop(o: number, c: string) { if (!(o >= 0 && o <= 1) || /NaN|undefined/.test(c)) throw new Error('bad stop ' + o + ' ' + c); } };
const mockCtx = () => new Proxy({} as Record<string, unknown>, {
  get(t, k) {
    if (k in t) return t[k as string];
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient') return (...a: number[]) => { if (a.some(v => !Number.isFinite(v))) throw new Error('bad gradient'); return grad; };
    if (k === 'measureText') return () => ({ width: 40 });
    return (...a: unknown[]) => { if (a.some(v => typeof v === 'number' && !Number.isFinite(v))) throw new Error('bad arg to ' + String(k)); };
  },
  set(t, k, v) { if (typeof v === 'string' && /NaN|undefined/.test(v)) throw new Error('bad ' + String(k) + ' ' + v); t[k as string] = v; return true; },
}) as unknown as CanvasRenderingContext2D;

const DAY = [{ h: 9.2, family: 'tense' as const, strength: 3 }, { h: 13.5, family: 'bright' as const, second: 'tense' as const, strength: 3 }, { h: 18.7, family: 'warm' as const, strength: 4 }, { h: 23.3, family: 'wistful' as const, strength: 2 }];

describe('drawings', () => {
  for (const theme of ['dark', 'light'] as const) {
    const look = lookOf(theme);
    it(`draws every form at every size in ${theme}`, () => {
      for (const f of FAMILIES) for (const r of [6, 12, 13, 30, 60]) for (const t of [0, 2.3, 57]) { drawForm(mockCtx(), look, f, 50, 50, r, t, 'calm'); drawSmall(mockCtx(), look, f, 20, 20, r); }
    });
    it(`draws the day pages in ${theme}, including an empty day`, () => {
      for (const ms of [DAY, [], [DAY[0]]]) for (const [w, h] of [[320, 300], [48, 48]]) { drawBloomLine(mockCtx(), look, w, h, 1.5, ms, 'warm'); drawScoreLine(mockCtx(), look, w, h, 1.5, ms); }
    });
  }
  it('keeps Warm as the rings and Tense as the two arms (the approved swap)', async () => {
    const src = (await import('node:fs')).readFileSync('src/draw/forms.ts', 'utf8');
    expect(src).toMatch(/warm\(ctx[^\n]*\n[^]*?Math\.sin\(a \* f \+ t \* 7/);
    expect(src).toMatch(/tense\(ctx[^\n]*\n[^]*?for \(let arm = 0; arm < 2; arm\+\+\)/);
  });
});
```

Run: `npx vitest run tests/draw.test.ts`. Expected: FAIL.

- [ ] **Step 2: Port the forms**

Create `src/draw/forms.ts` by porting from `design/pinboard8-source/`:
- `glow`, `dot` and `twinkle` from `p4-scenehead.js`;
- `formCols`, the `LINES` object (all nine families: Warm is the contour rings and Tense is the two arms, exactly as in the source; do not change any drawing or motion), `SMALL`, `drawSmall` and `drawForm` from `p7-forms.js`.

Apply these mechanical changes and nothing else:
1. Add parameter `look: Look` after `ctx` in `glow`'s callers, `formCols`, every `LINES.*` and `SMALL.*` function, `drawSmall` and `drawForm`, and pass it through.
2. Replace `pal()` with `look.pal`, and `ground()` with `{ ...look.ground, dark: look.theme === 'dark' }`.
3. Replace the page's `rgba(hex, a)` helper with this local one: `const rgba = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };`
4. Import `mix` from `../domain/colour`.
5. Add types to every parameter. TypeScript must pass with `strict`.

The top of the file:
```ts
import type { Family } from '../vocab/vocab';
import { GROUND, mix, palette, type Theme } from '../domain/colour';

export interface Look { theme: Theme; pal: Record<Family | 'fog', string>; ground: (typeof GROUND)['dark'] | (typeof GROUND)['light'] }
export const lookOf = (theme: Theme): Look => ({ theme, pal: palette(theme), ground: GROUND[theme] });
const rgba = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, c: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
}
export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, s), 0, Math.PI * 2); ctx.fill(); }
function formCols(look: Look, fam: Family) { const c = look.pal[fam], dark = look.theme === 'dark'; return { c, dark, lite: dark ? mix(c, '#FFFFFF', 0.45) : mix(c, '#000000', 0.14), ga: dark ? 0.32 : 0.26 }; }
```

One ported form as the pattern to follow (Bright, from `p7-forms.js`):
```ts
const LINES: Record<Family, (ctx: CanvasRenderingContext2D, look: Look, x: number, y: number, r: number, t: number) => void> = {
  bright(ctx, look, x, y, r, t) { const { c, lite, ga } = formCols(look, 'bright'); glow(ctx, x, y, r * 0.9, c, ga);
    ctx.lineWidth = Math.max(0.9, r * 0.035);
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2 + t * 0.06, k = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7) * Math.sin(t * 0.7 + i * 0.45), r0 = r * 0.3, r1 = r * (0.52 + 0.42 * k);
      ctx.strokeStyle = rgba(i % 2 ? lite : c, 0.5 + 0.45 * k); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
    dot(ctx, x, y, r * 0.19, c); dot(ctx, x, y, r * 0.1, lite); },
  // ...the other eight, ported the same way from p7-forms.js (warm = rings, tense = two arms)
} as never;
```
When porting, replace the `// ...` line with the eight real functions. Don't leave a comment in its place.

```ts
export function drawSmall(ctx: CanvasRenderingContext2D, look: Look, fam: Family, x: number, y: number, r: number) { /* port of drawSmall + SMALL */ }
export function drawForm(ctx: CanvasRenderingContext2D, look: Look, fam: Family, x: number, y: number, r: number, t: number, fam2?: Family) {
  if (r < 13) drawSmall(ctx, look, fam, x, y, r);
  else { ctx.save(); ctx.lineCap = 'round'; LINES[fam](ctx, look, x, y, r, t); ctx.restore(); }
  if (fam2) drawForm(ctx, look, fam2, x + r * 0.72, y - r * 0.66, r * 0.44, t);
}
```
Replace the `drawSmall` body comment with the ported `SMALL` table and `drawSmall` code.

- [ ] **Step 3: Port the day pages**

Create `src/draw/day.ts`:
- from `p7-scenes2.js`: `daylight`, `dayColorOk` (taking `moments` and `look` as parameters instead of the globals `MOMENTS` and `pal()`), `bloomLayer`, `bloomWash` and `drawDayBloomLine` (renamed `drawBloomLine`), and `drawScoreLine`;
- from `p7-scenes.js`: the `GLYPH` table, which `drawScoreLine` uses;
- the angle helper `const ang = (hh: number) => (hh - 12) / 24 * Math.PI * 2 - Math.PI / 2;`.

Apply the same mechanical rules as Step 2. In addition:
- replace `MOMENTS` with the `moments` parameter (`m.h`, `m.family` instead of `m.f`, `m.second` instead of `m.f2`, `m.strength` instead of `m.s`), and `OVERALL` with the `overall` parameter;
- in `bloomLayer`, create the offscreen canvas with `typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas')`, and return `null` when neither exists (tests run in Node), so the drawing falls back to painting the wash directly;
- with no moments, `drawBloomLine` draws only the soft glow and the overall form, and `drawScoreLine` draws only the line and hour labels.

- [ ] **Step 4: The canvas host**

`src/draw/Canvas.tsx`:
```tsx
import { useEffect, useRef } from 'react';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
const live = new Set<() => void>();
let T = 0, last = 0, running = false;
export const motion = { speed: 1 }; // Settings sets 0 (still), 1 (gentle) or 2.2 (lively)
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick(now: number) {
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; T += dt * (reduced ? 0 : motion.speed);
  live.forEach(f => f());
  if (live.size && motion.speed > 0 && !reduced && !document.hidden) requestAnimationFrame(tick); else { running = false; last = 0; }
}
export function Scene({ draw, animate = false, label, className }: { draw: Draw; animate?: boolean; label: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null), drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d'); if (!ctx) return;
    const paint = () => { const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return; const dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); drawRef.current(ctx, w, h, animate ? T : 0); };
    const ro = new ResizeObserver(paint); ro.observe(c); paint();
    if (animate) { live.add(paint); if (!running && motion.speed > 0 && !reduced) { running = true; requestAnimationFrame(tick); } }
    return () => { ro.disconnect(); live.delete(paint); };
  }, [animate]);
  return <canvas ref={ref} className={className} role="img" aria-label={label} />;
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/draw.test.ts && npm run typecheck`
Expected: PASS, and no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/draw tests/draw.test.ts
git commit -m "feat: port the Lines feeling forms, small forms, Bloom and Score drawings"
```

---

### Task 10: The look and the app shell (tokens, tab bar, sheets, Undo notice, routes)

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/app.css`, `src/router.ts`, `src/ui/Icons.tsx`, `src/ui/Tabs.tsx`, `src/ui/Sheet.tsx`, `src/ui/Undo.tsx`, `src/ui/Chips.tsx`, `src/ui/Look.tsx`, `src/domain/voices.ts`
- Modify: `src/App.tsx`, `src/main.tsx` (import the styles)
- Test: `tests/shell.test.tsx`

**Interfaces:**
- Consumes: colour (Task 4), `Undo` type (Task 6).
- Produces:
  - `type Route = { name: 'today' } | { name: 'cal'; month?: string } | { name: 'day'; day: string } | { name: 'feel'; when: 'now' | 'day'; word?: string } | { name: 'settings' } | { name: 'first-run' }`
  - `parseRoute(hash: string): Route`, `routeHash(r: Route): string`, `useRoute(): Route`, `go(r: Route): void`
  - `<Tabs current="today|cal|settings" />`
  - `<Sheet label onClose>{children}</Sheet>`
  - `UndoProvider`, and `useUndo(): { show(undo: Undo, message?: string): void; clear(): void }`
  - `<TagChip tag family />`, `<PersonChip initial thread />`, `<FeelingChip word family onOpen />`, `<MarkChip kind on onToggle />`
  - `VOICES: { name: string; greeting: string }[]` (the eight voices, exact wording as in `design/pinboard8-source/p7-data2.js` `VOICES`)
  - The CSS classes the screens use:
    - `.scr .content .panel .lbl .hint .entry .btn .btn.primary .btn.ghost .btn.wide .btn.big .iconbtn .chips .chip .marks .mark .toast .sheet .tabs .tab .plus .switch`
    - the Today classes `.thead.onwall .moms .mom .overall .sofar`
    - the calendar classes `.cal .mc .dn .formkey`

- [ ] **Step 1: Write the styles**

`src/styles/tokens.css`:
- Define the dark tokens on `:root` (dark is the default) and the light tokens on `:root[data-theme="light"]`, using exactly the values in `GROUND` (Task 4) as `--base --ink --card --solid --muted --rule --line --tag --scrim`.
- Add `--focus:#FDBA74` for dark and `#C2410C` for light.
- Add the type scale:
```css
:root{ --f13:.8125rem; --f14:.875rem; --f16:1rem; --f18:1.125rem; --f22:1.375rem; --f26:1.625rem; --tap:max(44px, 2.75rem); --gap:.625rem;
  --body:"Atkinson Hyperlegible", system-ui, sans-serif; --num:"Archivo Variable", "Archivo", var(--body); color-scheme:dark }
```
- `html{font-size:100%}`. Never set a px root size, so the phone's text setting still works.

`src/styles/app.css`: port the phone rules from `design/pinboard8-source/p7-phone.css`, applying these conversions:
- `.phone` becomes `body`, and `.scr` becomes the full-height screen container.
- `var(--scr-X)` becomes `var(--X)`, and `var(--u)` becomes `1rem`.
- Every `--f14` becomes `--f13`, `--f15` becomes `--f14`, `--f17` becomes `--f16`, `--f20` becomes `--f18`, `--f24` becomes `--f22`, and `--f30` becomes `--f26`. These are the round-8 sizes. Check each one against Global Constraints.
- Drop the pinboard-only rules: `.sbar`, `.wall`, `.fakebg`, `.fr1`, `.hpost`, `.trouble`, `.dstyles`, `.ds-score` background overrides, `.gal`, `.gc2`, `.ycanvas`, `.life`, `.wrapped`, `.mast` and `.rep-*`. Most of them come back in Stages 2 and 3.
- Keep the reflow rules at the end of the file, `.marks{grid-template-columns:repeat(2, minmax(0, 1fr))}`, and the `@keyframes land` and `rise`, with `@media (prefers-reduced-motion: reduce)` turning them off.
- `body.ts-big .tab i` (labels hidden) becomes `@media (min-resolution: 0dppx) and (min-width: 0)`. Instead, hide labels when `document.documentElement.style.fontSize` or the computed rem is above 18px: in `App`, set `data-big-text` on `<html>` when `parseFloat(getComputedStyle(document.documentElement).fontSize) > 18`, and use `html[data-big-text] .tab i{…hidden…}`.
- Add the phone-edge rules: `body{margin:0; background:var(--base); color:var(--ink); font-family:var(--body); font-size:var(--f16); line-height:1.45}`, `::selection{background:var(--ink); color:var(--base)}` and `:focus-visible{outline:3px solid var(--focus); outline-offset:2px}`.
- Add the laptop width rule: `@media (min-width:1024px){ .content{max-width:720px; margin-inline:auto} }`. The full reading room is Stage 3.

- [ ] **Step 2: Write the failing shell tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash } from '../src/router';
import { Tabs } from '../src/ui/Tabs';
import { TagChip, MarkChip } from '../src/ui/Chips';
import { VOICES } from '../src/domain/voices';

describe('routes', () => {
  it('round-trips every route', () => {
    for (const r of [{ name: 'today' }, { name: 'cal', month: '2026-09' }, { name: 'day', day: '2026-09-29' }, { name: 'feel', when: 'day' }, { name: 'settings' }, { name: 'first-run' }] as const)
      expect(parseRoute(routeHash(r))).toEqual(r);
  });
  it('sends anything unknown to Today', () => expect(parseRoute('#/nope')).toEqual({ name: 'today' }));
});
describe('shared parts', () => {
  it('tabs name every destination and mark the current one', () => {
    const html = renderToStaticMarkup(<Tabs current="cal" />);
    for (const w of ['Today', 'Calendar', 'Add', 'Settings']) expect(html).toContain(w);
    expect(html).toMatch(/aria-current="page"[^>]*>[^]*Calendar/);
  });
  it('tags show # and their name; marks show their word', () => {
    expect(renderToStaticMarkup(<TagChip tag="walk" family="warm" />)).toMatch(/#.*walk/);
    expect(renderToStaticMarkup(<MarkChip kind="quiet" on={false} onToggle={() => {}} />)).toContain('Don’t bring back');
  });
  it('has the eight voices', () => expect(VOICES.map(v => v.name)).toEqual(['Archivist', 'Friend', 'Gremlin', 'Ship’s captain', 'Nature documentary', 'Noir detective', 'Time traveller', 'Conspiracy theorist']));
});
```

Run: `npx vitest run tests/shell.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement router, voices, icons, tabs, chips, sheet and Undo**

`src/router.ts`:
```ts
import { useSyncExternalStore } from 'react';
export type Route = { name: 'today' } | { name: 'cal'; month?: string } | { name: 'day'; day: string } | { name: 'feel'; when: 'now' | 'day'; word?: string } | { name: 'settings' } | { name: 'first-run' };
export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?'), p = new URLSearchParams(query), [a, b] = path.split('/');
  if (a === 'cal') return b ? { name: 'cal', month: b } : { name: 'cal' };
  if (a === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(b ?? '')) return { name: 'day', day: b };
  if (a === 'feel') { const r: Route = { name: 'feel', when: p.get('when') === 'day' ? 'day' : 'now' }; const w = p.get('word'); return w ? { ...r, word: w } : r; }
  if (a === 'settings') return { name: 'settings' };
  if (a === 'first-run') return { name: 'first-run' };
  return { name: 'today' };
}
export function routeHash(r: Route): string {
  if (r.name === 'cal') return r.month ? `#/cal/${r.month}` : '#/cal';
  if (r.name === 'day') return `#/day/${r.day}`;
  if (r.name === 'feel') return `#/feel?when=${r.when}${r.word ? `&word=${encodeURIComponent(r.word)}` : ''}`;
  return `#/${r.name}`;
}
const sub = (cb: () => void) => { addEventListener('hashchange', cb); return () => removeEventListener('hashchange', cb); };
export const useRoute = () => parseRoute(useSyncExternalStore(sub, () => location.hash, () => '#/today'));
export const go = (r: Route) => { location.hash = routeHash(r); };
```

`src/domain/voices.ts`: copy the eight `[name, greeting]` pairs from `design/pinboard8-source/p7-data2.js` `VOICES`:
```ts
export const VOICES = [
  { name: 'Archivist', greeting: '“Evening. Anything worth keeping from today?”' },
  { name: 'Friend', greeting: '“Hey you. How was today, really?”' },
  { name: 'Gremlin', greeting: '“Feed me a memory. A small one. I’m not picky.”' },
  { name: 'Ship’s captain', greeting: '“Log entry. Rough seas by morning, calm by dusk. Report, sailor.”' },
  { name: 'Nature documentary', greeting: '“And here, as dusk settles, the human returns to its burrow to reflect.”' },
  { name: 'Noir detective', greeting: '“The day had a secret. They always do. Spill it.”' },
  { name: 'Time traveller', greeting: '“Future you asked me to collect this one. What happened?”' },
  { name: 'Conspiracy theorist', greeting: '“They don’t want you writing this down. Write it down.”' },
];
```

`src/ui/Icons.tsx`:
- Export an `Icon` component, `({ name }: { name: IconName }) => <svg viewBox="0 0 24 24" aria-hidden="true">…</svg>`.
- It covers the icons in `design/pinboard8-source/p7-kit.js` `IC`: today, cal, plus, first, gift, lock, quiet, search, gear, more, back, next, down, up and close. Copy the path data exactly.
- All icons use `fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"`.

`src/ui/Tabs.tsx`:
```tsx
import { Icon } from './Icons';
import { go } from '../router';
const TABS = [['today', 'Today', 'today'], ['cal', 'Calendar', 'cal'], ['settings', 'Settings', 'gear']] as const;
export function Tabs({ current }: { current: 'today' | 'cal' | 'settings' }) {
  return <nav className="tabs" aria-label="Main">
    {TABS.slice(0, 2).map(([k, label, icon]) => <button key={k} type="button" className={'tab' + (k === current ? ' on' : '')} aria-current={k === current ? 'page' : undefined} aria-label={label} onClick={() => go({ name: k } as never)}><Icon name={icon} /><i>{label}</i></button>)}
    <button type="button" className="plus" aria-label="Add" onClick={() => go({ name: 'feel', when: 'now' })}><Icon name="plus" /></button>
    {TABS.slice(2).map(([k, label, icon]) => <button key={k} type="button" className={'tab' + (k === current ? ' on' : '')} aria-current={k === current ? 'page' : undefined} aria-label={label} onClick={() => go({ name: k } as never)}><Icon name={icon} /><i>{label}</i></button>)}
  </nav>;
}
```
In Stage 1, `+` opens the feeling picker, because feelings are the only thing to add yet. Shelves and Almanac tabs arrive in Stages 2 and 3; `.tabs` uses `grid-template-columns: 1fr 1fr auto 1fr`.

`src/ui/Chips.tsx`:
```tsx
import type { Family } from '../vocab/vocab';
import { MARK_FAMILY, PERSON_THREADS, palette, solid, onColor } from '../domain/colour';
import { Icon } from './Icons';
import { useLook } from './Look';
export function TagChip({ tag, family, onOpen }: { tag: string; family: Family; onOpen?: () => void }) { const { pal } = useLook(); return <button type="button" className="tagchip" style={{ ['--tc' as string]: pal[family] }} onClick={onOpen}><b aria-hidden="true">#</b>{tag}</button>; }
export const PersonChip = ({ initial, thread }: { initial: string; thread: number }) => <span className="mention" style={{ ['--pc' as string]: PERSON_THREADS[thread % PERSON_THREADS.length] }}><b aria-hidden="true">@</b>{initial}</span>;
export function FeelingChip({ word, family, onOpen }: { word: string; family: Family; onOpen: () => void }) { const { pal } = useLook(); return <button type="button" className="feelchip" style={{ ['--fc' as string]: pal[family] }} aria-label={`${word}, a feeling. Open its card`} onClick={onOpen}>{word}</button>; }
const MARKS = { first: ['First', 'first'], gift: ['Gift', 'gift'], priv: ['Private', 'lock'], quiet: ['Don’t bring back', 'quiet'] } as const;
export function MarkChip({ kind, on, onToggle }: { kind: keyof typeof MARKS; on: boolean; onToggle: () => void }) {
  const { pal } = useLook(), c = pal[MARK_FAMILY[kind]], fill = solid(c);
  return <button type="button" className={'mark' + (on ? ' on' : '')} aria-pressed={on} style={{ ['--mc' as string]: c, ...(on ? { background: fill, color: onColor(fill) } : {}) }} onClick={onToggle}><Icon name={MARKS[kind][1]} /><span>{MARKS[kind][0]}</span></button>;
}
```

`src/ui/Look.tsx` shares the theme with every part that draws colour. `App` provides it from `settings.theme` (dark by default):
```tsx
import { createContext, useContext } from 'react';
import { lookOf, type Look } from '../draw/forms';
const Ctx = createContext<Look>(lookOf('dark'));
export const LookProvider = Ctx.Provider;
export const useLook = () => useContext(Ctx);
```
Everywhere later tasks write `const look = lookOf('dark')` or `palette('dark')` at module level (`Today.tsx`, `LineWriter.tsx`, `DayPage.tsx`, `Calendar.tsx`, the picker and the card), use `const look = useLook()` inside the component instead, and pass `look` (or `look.pal`) down. `highlight()` takes `pal` as a fourth parameter, defaulting to `palette('dark')`. In `App`, wrap the routes in `<LookProvider value={lookOf(settings.theme)}>` (read `settings` with `useLiveQuery(() => getSettings(db))`), and set `document.documentElement.dataset.theme = settings.theme`.

`src/ui/Sheet.tsx`:
```tsx
import { useEffect, useRef, type ReactNode } from 'react';
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>('button, input, textarea')?.focus(); const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
  return <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref}>{children}</div>;
}
```

`src/ui/Undo.tsx`:
```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Undo } from '../db/actions';
type Api = { show: (u: Undo, message?: string) => void; clear: () => void };
const Ctx = createContext<Api>({ show: () => {}, clear: () => {} });
export const useUndo = () => useContext(Ctx);
/* One notice at a time; it stays until the next action, and Undo runs at most once. */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [cur, setCur] = useState<{ u: Undo; message: string } | null>(null);
  const show = useCallback((u: Undo, message?: string) => setCur({ u, message: message ?? u.label }), []);
  const clear = useCallback(() => setCur(null), []);
  return <Ctx.Provider value={{ show, clear }}>{children}
    {cur && <div className="toast" role="status"><span>{cur.message}</span><button type="button" className="btn sm" onClick={async () => { const u = cur.u; setCur(null); await u.run(); }}>Undo</button></div>}
  </Ctx.Provider>;
}
```

`src/App.tsx`:
```tsx
import { useEffect } from 'react';
import { useRoute } from './router';
import { UndoProvider } from './ui/Undo';
import { Today } from './screens/Today';
import { Calendar } from './screens/Calendar';
import { DayPage } from './screens/DayPage';
import { FeelingPicker } from './screens/FeelingPicker';
import { Settings } from './screens/Settings';
import { FirstRun } from './screens/FirstRun';
export function App() {
  const r = useRoute();
  useEffect(() => { if (typeof document !== 'undefined') document.documentElement.toggleAttribute('data-big-text', parseFloat(getComputedStyle(document.documentElement).fontSize) > 18); }, []);
  return <div id="app-root"><UndoProvider>
    {r.name === 'today' && <Today />}
    {r.name === 'cal' && <Calendar month={r.month} />}
    {r.name === 'day' && <DayPage day={r.day} />}
    {r.name === 'feel' && <FeelingPicker when={r.when} word={r.word} />}
    {r.name === 'settings' && <Settings />}
    {r.name === 'first-run' && <FirstRun />}
  </UndoProvider></div>;
}
```
Until Tasks 11–15 exist, create each screen file as `export function Today() { return <div className="scr" />; }` (the same for the others, with their props typed), so this compiles. Each later task replaces its stub.

In `src/main.tsx`, add `import './styles/tokens.css'; import './styles/app.css';`.

- [ ] **Step 4: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests/shell.test.tsx
git commit -m "feat: the look, routes, tab bar, sheets, chips and the Undo notice"
```

---

### Task 11: Today and the writing box

**Files:**
- Create/replace: `src/screens/Today.tsx`, `src/screens/LineWriter.tsx`
- Test: `tests/today.test.tsx`

**Interfaces:**
- Consumes:
  - `keepLine`, `confirmOverall`, `removeEntry`, `removeMoment`, `StorageFullError` (Task 6);
  - `tokenize`, `tokenAt` (Task 5); `searchFeelings`, `feelingOf`, `ladderName`, `FAMILY_NAME` (Task 3);
  - `isNight`, `dayKey`, `timeLabel` (Task 2); `drawForm`, `lookOf`, `Scene` (Task 9);
  - the chips, `useUndo`, `Sheet`, `go` (Task 10); `VOICES` (Task 10); `<FeelingCard>` (Task 12, stubbed here as `null` until Task 12 lands).
- Produces:
  - `TodayView(props: TodayProps)`, which is pure:
    - `TodayProps = { now: Date; greeting: string; night: boolean; entries: Entry[]; moments: Moment[]; overall?: DayRow['overall']; suggested?: { word: string; family: Family; strength: number }; grateful?: string; foldedOpen: boolean; onToggleFold(): void; onConfirmOverall(): void; onChangeOverall(): void; onOpenFeeling(word: string, src: FeelingSource): void; onEntryMenu(id: number): void; writer: ReactNode }`
    - `type FeelingSource = { kind: 'draft' } | { kind: 'entry'; id: number } | { kind: 'moment'; id: number } | { kind: 'none' }`
  - `Today()`, the container;
  - `LineWriter({ own, people, tags, onOpenFeeling, removerRef })` (`removerRef: { current: ((word: string) => void) | null }` is filled with a function that removes a feeling from the draft, with Undo; Task 12's card uses it), which owns the draft (saved to `sessionStorage` key `logbook-draft` so an accidental close keeps it), the suggestions, the marks and the Keep button;
  - `suggestedOverall(moments: Moment[]): { word: string; family: Family; strength: number } | undefined`, a pure helper: the family with the most moments, its latest word, and strength 3.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayView, suggestedOverall } from '../src/screens/Today';
import { highlight } from '../src/screens/LineWriter';

const base = { now: new Date('2026-09-29T23:24:00'), greeting: '“Evening.”', entries: [], moments: [], foldedOpen: false, onToggleFold() {}, onConfirmOverall() {}, onChangeOverall() {}, onOpenFeeling() {}, onEntryMenu() {}, writer: <div className="writer" /> };
const m = (word: string, family: 'calm' | 'warm' | 'low', h: number) => ({ id: h, day: '2026-09-29', at: new Date(`2026-09-29T${String(h).padStart(2, '0')}:00:00`).getTime(), word, family, strength: 3 });

describe('Today', () => {
  it('at night shows only the line, inner weather and the day overall, with one Today so far row', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={true} moments={[m('calm', 'calm', 9)]} suggested={{ word: 'calm', family: 'calm', strength: 3 }} />);
    expect(html).toContain('Today’s line');
    expect(html).toContain('Inner weather');
    expect(html).toContain('The day overall');
    expect(html).toContain('Today so far');
    expect(html).not.toContain('Grateful for');
  });
  it('during the day shows grateful for as its own section', () => {
    expect(renderToStaticMarkup(<TodayView {...base} night={false} />)).toContain('Grateful for');
  });
  it('an empty day invites the first feeling instead of showing nothing', () => {
    expect(renderToStaticMarkup(<TodayView {...base} night={false} />)).toContain('No feelings yet today');
  });
  it('never prints undefined or NaN', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={true} entries={[{ id: 1, day: '2026-09-29', at: base.now.getTime(), tz: 'UTC', kind: 'line', text: '#walk :calm :asdf', marks: { first: true }, tags: ['walk'], people: [], writtenAt: 0 }]} moments={[m('calm', 'calm', 22)]} overall={{ word: 'calm', family: 'calm', strength: 3, set: true }} />);
    expect(html).not.toMatch(/undefined|NaN/);
  });
  it('suggests the day overall from the most-felt family', () => {
    expect(suggestedOverall([m('calm', 'calm', 9), m('close', 'warm', 18), m('content', 'calm', 20)])).toEqual({ word: 'content', family: 'calm', strength: 3 });
    expect(suggestedOverall([])).toBeUndefined();
  });
});
describe('the writing box highlight', () => {
  it('marks known feelings as chips, unknown ones as plain underlined text, and escapes HTML', () => {
    const html = highlight('<b> #walk :calm :asdf', {});
    expect(html).toContain('&lt;b&gt;');
    expect(html).toMatch(/class="h-feel"[^>]*>:calm/);
    expect(html).toMatch(/class="h-unknown"[^>]*>:asdf/);
    expect(html).toMatch(/class="h-tag"[^>]*>#walk/);
  });
});
```

Run: `npx vitest run tests/today.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement LineWriter.tsx**

The writing box is a transparent `<textarea>` over a highlight mirror, as in `design/pinboard8-source/p7-kit.js` `hlHTML` and `p7-nav.js` `bindProto`.

```tsx
import { useEffect, useRef, useState } from 'react';
import { db } from '../db/db';
import { keepLine, StorageFullError } from '../db/actions';
import { tokenize, tokenAt } from '../domain/line';
import { feelingOf, searchFeelings, FAMILY_NAME, type Family } from '../vocab/vocab';
import { palette, PERSON_THREADS } from '../domain/colour';
import { MarkChip } from '../ui/Chips';
import { useUndo } from '../ui/Undo';
import type { Marks, Person } from '../db/types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pal = palette('dark');
/* The mirror behind the textarea: same text, with tags, people and feelings painted in. */
export function highlight(text: string, own: Record<string, Family>, people: Person[] = []): string {
  let out = '', i = 0;
  for (const t of tokenize(text)) {
    out += esc(text.slice(i, t.start));
    if (t.kind === 'tag') out += `<mark class="h-tag">${esc(t.raw)}</mark>`;
    else if (t.kind === 'person') { const p = people.find(q => q.initial === t.value); out += p ? `<mark class="h-person" style="--pc:${PERSON_THREADS[p.thread % 8]}">${esc(t.raw)}</mark>` : esc(t.raw); }
    else { const x = feelingOf(t.value, own); out += x ? `<mark class="h-feel" style="--fc:${pal[x.family]}">${esc(t.raw)}</mark>` : `<mark class="h-unknown">${esc(t.raw)}</mark>`; }
    i = t.end;
  }
  return out + esc(text.slice(i)) + '\n';
}
type Sugg = { label: string; insert: string; note: string; family?: Family };
export function LineWriter({ own, people, tags, onOpenFeeling }: { own: Record<string, Family>; people: Person[]; tags: string[]; onOpenFeeling: (word: string) => void }) {
  const [text, setText] = useState(() => sessionStorage.getItem('logbook-draft') ?? '');
  const [marks, setMarks] = useState<Marks>({});
  const [sugg, setSugg] = useState<{ items: Sugg[]; start: number } | null>(null);
  const [error, setError] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null), undo = useUndo();
  useEffect(() => { sessionStorage.setItem('logbook-draft', text); }, [text]);
  const suggest = (value: string, caret: number) => {
    const m = value.slice(0, caret).match(/(^|\s)([#@:])([\p{L}\p{N}_'-]*)$/u);
    if (!m) return setSugg(null);
    const q = m[3].toLowerCase(), start = caret - m[3].length - 1;
    let items: Sugg[] = [];
    if (m[2] === '#') { items = tags.filter(t => t.startsWith(q)).slice(0, 5).map(t => ({ label: '#' + t, insert: '#' + t, note: '' })); if (q && !tags.includes(q)) items.push({ label: `Make a new tag, #${q}`, insert: '#' + q, note: '' }); }
    else if (m[2] === '@') items = people.filter(p => p.initial.toLowerCase().startsWith(q)).map(p => ({ label: `@${p.initial}, ${p.name}`, insert: '@' + p.initial, note: '' }));
    else items = (q ? searchFeelings(q, own, 6) : ['calm', 'content', 'tired', 'anxious', 'grateful', 'nostalgic'].map(w => ({ w, family: feelingOf(w, own)!.family, note: '', kind: 'atlas' as const })))
      .map(h => ({ label: h.w, insert: ':' + h.w.replace(/ /g, '-'), note: FAMILY_NAME[h.family] + (h.note.startsWith('means') ? ', ' + h.note : ''), family: h.family }));
    setSugg(items.length ? { items, start } : null);
  };
  const apply = (s: Sugg) => { const el = ta.current!, caret = el.selectionStart, next = text.slice(0, sugg!.start) + s.insert + ' ' + text.slice(caret); setText(next); setSugg(null);
    requestAnimationFrame(() => { const p = sugg!.start + s.insert.length + 1; el.focus(); el.setSelectionRange(p, p); }); };
  const keep = async () => {
    if (!text.trim()) return; setError('');
    try { const r = await keepLine(db, { text, marks, at: new Date() }, own); setText(''); setMarks({}); sessionStorage.removeItem('logbook-draft');
      const added = r.momentId ? ' Your feelings were added to your inner weather.' : '';
      undo.show(r.undo, `Kept.${added}${r.skipped.length ? ` ${r.skipped.join(', ')} was already there from the last hour.` : ''}`);
    } catch (e) { setError(e instanceof StorageFullError ? e.message : 'That didn’t save. Your words are still in the box; try Keep again.'); }
  };
  const onClick = () => { const el = ta.current!, tk = tokenAt(text, el.selectionStart);
    if (tk?.kind === 'feeling' && text[tk.end] === ' ' && feelingOf(tk.value, own)) { onOpenFeeling(tk.value); return; } suggest(text, el.selectionStart); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void keep(); return; }
    const el = e.currentTarget; if (e.key !== 'Backspace' || el.selectionStart !== el.selectionEnd) return;
    const pos = el.selectionStart, tk = tokenAt(text, pos - 1) ?? tokenAt(text, pos);
    if (tk?.kind === 'feeling' && feelingOf(tk.value, own) && (pos === tk.end || pos === tk.end + 1)) { e.preventDefault(); const cut = text[tk.end] === ' ' && pos === tk.end + 1 ? tk.end + 1 : tk.end; setText(text.slice(0, tk.start) + text.slice(cut)); requestAnimationFrame(() => el.setSelectionRange(tk.start, tk.start)); }
  };
  return <section className="panel compose" aria-labelledby="h-line">
    <h2 className="lbl" id="h-line">Today’s line</h2>
    <div className="composer">
      <div className="hl" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlight(text, own, people) }} />
      <textarea ref={ta} value={text} placeholder="Today in a line, or a few…" aria-label="Today’s line" aria-describedby="h-hint"
        onChange={e => { setText(e.target.value); suggest(e.target.value, e.target.selectionStart); }} onClick={onClick} onKeyDown={onKeyDown} onBlur={() => setTimeout(() => setSugg(null), 150)} />
      {sugg && <div className="sugg">{sugg.items.map(s => <button key={s.insert} type="button" onMouseDown={e => e.preventDefault()} onClick={() => apply(s)}>
        {s.family ? <i className="sdot" style={{ background: pal[s.family] }} /> : <i className="sdot ring" />}<span>{s.label}{s.note && <small>{s.note}</small>}</span></button>)}</div>}
    </div>
    <p className="hint" id="h-hint">Type # for a tag, @ for a person, : for a feeling. Tap a feeling to see its card.</p>
    <div className="marks" role="group" aria-label="Marks for this entry">
      {(['first', 'gift', 'priv', 'quiet'] as const).map(k => <MarkChip key={k} kind={k} on={!!marks[k]} onToggle={() => setMarks({ ...marks, [k]: !marks[k] })} />)}
    </div>
    {error && <p className="hint" role="alert">{error}</p>}
    <button type="button" className="btn primary wide" disabled={!text.trim()} onClick={keep}>Keep this line</button>
  </section>;
}
```

- [ ] **Step 3: Implement Today.tsx**

The view is ported from `design/pinboard8-source/p7-screens.js` `pToday` and `keptCard`, and trimmed to Stage 1: no photos, Health, song, stamps or on this day yet.

```tsx
import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { confirmOverall, getSettings, removeEntry } from '../db/actions';
import type { DayRow, Entry, Moment } from '../db/types';
import { dayKey, isNight, timeLabel } from '../domain/day';
import { tokenize } from '../domain/line';
import { FAMILY_NAME, feelingOf, ladderName, type Family } from '../vocab/vocab';
import { drawForm, lookOf } from '../draw/forms';
import { Scene } from '../draw/Canvas';
import { FeelingChip, TagChip } from '../ui/Chips';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { Sheet } from '../ui/Sheet';
import { useUndo } from '../ui/Undo';
import { go } from '../router';
import { VOICES } from '../domain/voices';
import { LineWriter } from './LineWriter';
import { FeelingCard, type FeelingSource } from './FeelingCard';

const look = lookOf('dark');
export const Form = ({ family, second, label }: { family: Family; second?: Family; label: string }) =>
  <Scene animate label={label} draw={(ctx, w, h, t) => drawForm(ctx, look, family, w / 2, h / 2, Math.min(w, h) * 0.31, t, second)} />;
export function suggestedOverall(moments: Moment[]) {
  if (!moments.length) return undefined;
  const n = new Map<Family, number>(); moments.forEach(m => n.set(m.family, (n.get(m.family) ?? 0) + 1));
  const top = [...n.entries()].sort((a, b) => b[1] - a[1])[0][0], latest = [...moments].filter(m => m.family === top).sort((a, b) => b.at - a.at)[0];
  return { word: latest.word, family: top, strength: 3 };
}
export function RichText({ text, own, onOpenFeeling, tagHistory = {}, todayFamily = 'calm' }: { text: string; own: Record<string, Family>; onOpenFeeling: (w: string) => void; tagHistory?: Record<string, Family[]>; todayFamily?: Family }) {
  const parts: ReactNode[] = []; let i = 0;
  tokenize(text).forEach((t, k) => {
    parts.push(text.slice(i, t.start));
    if (t.kind === 'tag') parts.push(<TagChip key={k} tag={t.value} family={tagFamily(t.value, tagHistory, todayFamily)} />);
    else if (t.kind === 'person') parts.push(<span key={k} className="mention"><b aria-hidden="true">@</b>{t.value}</span>);
    else { const x = feelingOf(t.value, own); parts.push(x ? <FeelingChip key={k} word={x.w} family={x.family} onOpen={() => onOpenFeeling(x.w)} /> : t.raw); }
    i = t.end;
  });
  parts.push(text.slice(i));
  return <p className="entry">{parts}</p>;
}
export type TodayProps = { now: Date; greeting: string; night: boolean; entries: Entry[]; moments: Moment[]; overall?: DayRow['overall']; suggested?: { word: string; family: Family; strength: number }; grateful?: string; foldedOpen: boolean; own?: Record<string, Family>;
  onToggleFold(): void; onConfirmOverall(): void; onChangeOverall(): void; onOpenFeeling(word: string, src: FeelingSource): void; onEntryMenu(id: number): void; writer: ReactNode };
export function TodayView(p: TodayProps) {
  const own = p.own ?? {}, ov = p.overall ?? (p.suggested ? { ...p.suggested, set: false } : undefined);
  const header = <header className="thead onwall"><div className="hrow"><div className="hdate"><h1 className="tdate">{p.now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h1></div>
    <div className="hbtns"><button type="button" className="iconbtn" aria-label="Settings" onClick={() => go({ name: 'settings' })}><Icon name="gear" /></button></div></div><p className="voice">{p.greeting}</p></header>;
  const kept = p.entries.length ? <section className="panel"><h2 className="lbl">Kept today</h2>{[...p.entries].sort((a, b) => b.at - a.at).map(e => <div className="ent" key={e.id}>
    <div className="ent-top"><div className="ent-body"><RichText text={e.text} own={own} onOpenFeeling={w => p.onOpenFeeling(w, { kind: 'entry', id: e.id! })} /></div>
      <button type="button" className="iconbtn sm" aria-label="Change or remove this entry" onClick={() => p.onEntryMenu(e.id!)}><Icon name="more" /></button></div>
    <div className="ent-meta"><span>{timeLabel(new Date(e.at))}</span>{e.marks.first && <span className="mpill">First</span>}{e.marks.gift && <span className="mpill">Gift</span>}{e.marks.priv && <span className="mpill">Private</span>}{e.marks.quiet && <span className="mpill">Don’t bring back</span>}</div></div>)}</section> : null;
  const weather = <section className="panel" aria-labelledby="h-weather"><h2 className="lbl" id="h-weather">Inner weather</h2>
    {p.moments.length ? <div className="moms" role="list">{[...p.moments].sort((a, b) => a.at - b.at).map(m => <button key={m.id} type="button" className="mom" onClick={() => p.onOpenFeeling(m.word, { kind: 'moment', id: m.id! })} aria-label={`${timeLabel(new Date(m.at))}, ${m.word}. Open its card`}>
      <Form family={m.family} second={m.second} label={FAMILY_NAME[m.family]} /><b>{timeLabel(new Date(m.at)).replace(/ (am|pm)/, '')}</b><i>{m.word}</i></button>)}</div>
      : <p className="hint">No feelings yet today. Add one below, or type : in your line.</p>}
    <button type="button" className="btn wide" onClick={() => go({ name: 'feel', when: 'now' })}><Icon name="plus" />Add a feeling</button>
    {ov && <><div className="overall"><span className="ov-form"><Form family={ov.family} label={FAMILY_NAME[ov.family]} /></span><div className="ov-text"><p className="ov-l">The day overall{ov.set ? '' : ', suggested from your moments'}</p><p className="ov-w"><b>{FAMILY_NAME[ov.family]}</b>, like {ladderName(ov.family, ov.strength).toLowerCase()}</p></div></div>
      <div className="btnrow">{ov.set ? <span className="done">Set for today</span> : <button type="button" className="btn primary" onClick={p.onConfirmOverall}>That’s it</button>}<button type="button" className="btn" onClick={p.onChangeOverall}>Change</button></div></>}
    <button type="button" className="btn ghost wide" onClick={() => go({ name: 'day', day: dayKey(p.now) })}>Open today’s page</button></section>;
  const grateful = <section className="panel"><h2 className="lbl">Grateful for</h2><p className="entry">{p.grateful || <span className="hint">One small thing, when you feel like it.</span>}</p></section>;
  const sofar = p.foldedOpen ? <>{grateful}<button type="button" className="btn ghost wide" aria-expanded="true" onClick={p.onToggleFold}><Icon name="up" />Fold away</button></>
    : <button type="button" className="sofar" aria-expanded="false" onClick={p.onToggleFold}><span className="sf-l">Today so far</span><span className="sf-s">grateful for</span><span className="sf-i"><Icon name="down" /></span></button>;
  return <div className="scr"><div className="content scroll">{header}{p.writer}{kept}{weather}{p.night ? sofar : grateful}</div><Tabs current="today" /></div>;
}
export function Today() {
  const now = new Date(), day = dayKey(now), undo = useUndo();
  const [open, setOpen] = useState(false), [card, setCard] = useState<{ word: string; src: FeelingSource } | null>(null), [menu, setMenu] = useState<number | null>(null);
  const data = useLiveQuery(async () => ({
    entries: await db.entries.where('day').equals(day).toArray(), moments: await db.moments.where('day').equals(day).toArray(),
    row: await db.days.get(day), settings: await getSettings(db), people: await db.people.toArray(), tags: (await db.tags.toArray()).map(t => t.name),
    own: Object.fromEntries((await db.words.toArray()).map(w => [w.word, w.family])) as Record<string, Family>,
  }), [day]);
  if (!data) return <div className="scr" />;
  if (!data.settings.starterLoaded && !localStorage.getItem('logbook-first-run-skipped')) { go({ name: 'first-run' }); return <div className="scr" />; }
  const suggested = suggestedOverall(data.moments);
  return <>
    <TodayView now={now} greeting={VOICES[data.settings.voice % VOICES.length].greeting} night={isNight(now)} entries={data.entries} moments={data.moments} overall={data.row?.overall} suggested={suggested} grateful={data.row?.grateful} own={data.own}
      foldedOpen={open} onToggleFold={() => setOpen(!open)} onConfirmOverall={async () => { if (suggested) undo.show(await confirmOverall(db, day, suggested), `The day overall is ${FAMILY_NAME[suggested.family].toLowerCase()}.`); }}
      onChangeOverall={() => go({ name: 'feel', when: 'day' })} onOpenFeeling={(word, src) => setCard({ word, src })} onEntryMenu={setMenu}
      writer={<LineWriter own={data.own} people={data.people} tags={data.tags} onOpenFeeling={w => setCard({ word: w, src: { kind: 'draft' } })} />} />
    {card && <FeelingCard word={card.word} src={card.src} own={data.own} onClose={() => setCard(null)} />}
    {menu != null && <Sheet label="This entry" onClose={() => setMenu(null)}><p className="tdate sm">This entry</p><div className="btnrow col">
      <button type="button" className="btn danger wide" onClick={async () => { const id = menu; setMenu(null); undo.show(await removeEntry(db, id), 'Removed.'); }}>Remove it</button>
      <button type="button" className="btn primary wide" onClick={() => setMenu(null)}>Close</button></div></Sheet>}
  </>;
}
```

Create `src/screens/FeelingCard.tsx` now as a stub, so this compiles until Task 12 replaces it:
```tsx
import type { Family } from '../vocab/vocab';
export type FeelingSource = { kind: 'draft' } | { kind: 'entry'; id: number } | { kind: 'moment'; id: number } | { kind: 'none' };
export function FeelingCard(_: { word: string; src: FeelingSource; own: Record<string, Family>; onClose: () => void }) { return null; }
```

Tag colours:
- Add `import { tagFamily } from '../domain/colour';` to `Today.tsx`.
- In `Today`'s `useLiveQuery`, build `tagHistory: Record<string, Family[]>`. For every entry, push the families of that day's moments onto each of its tags: `for (const e of allEntries) for (const t of e.tags) (h[t] ??= []).push(...(momentsByDay[e.day] ?? []).map(m => m.family))`. Read all entries and moments; Stage 1 volumes are small.
- Add `tagHistory?: Record<string, Family[]>` to `TodayProps`, and pass `tagHistory` and `todayFamily={suggested?.family ?? 'calm'}` to every `RichText`.
- Pass `removerRef` to `LineWriter`. Create it in `Today` with `useRef<((w: string) => void) | null>(null)`, and inside `LineWriter` set `removerRef.current = word => { const before = text; setText(removeFeelingToken(text, word)); undo.show({ label: 'Removed', run: async () => setText(before) }, `Removed ${word} from your line.`); }` on every render.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/today.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Check it by hand**

Run: `npm run dev`, then open http://localhost:5174/#/today in Chrome's device mode at 360 × 780.
Expected:
- Typing `:cal` shows suggestions, and picking one paints a chip.
- Tapping inside the chip's word opens nothing yet (the stub), and there's no error in the console.
- Keep stores the line, and the Undo notice appears. Undo brings the words back.
- Backspace right after a chip deletes the whole feeling.

- [ ] **Step 6: Commit**

```bash
git add src/screens/Today.tsx src/screens/LineWriter.tsx src/screens/FeelingCard.tsx tests/today.test.tsx
git commit -m "feat: Today with night and day states, the writing box with chips, Keep and Undo"
```

---

### Task 12: The feeling picker and the feeling card

**Files:**
- Replace: `src/screens/FeelingPicker.tsx`, `src/screens/FeelingCard.tsx`
- Test: `tests/picker.test.tsx`

**Interfaces:**
- Consumes:
  - `keepMoment`, `setOverall`, `removeFeelingFromEntry`, `removeMoment`, `addOwnWord` (Task 6);
  - `groupsOf`, `searchFeelings`, `findWord`, `feelingOf`, `slangTargets`, `ladderName`, `FAMILY_INFO`, `FAMILY_NAME`, `FAMILIES`, `BLENDS`, `RARE_WORDS` (Task 3);
  - `Form` (Task 11); `Sheet`, `useUndo`, `go` (Task 10).
- Produces:
  - `FeelingPickerView(props: { when: 'now'|'day'; fam: Family; word: string; strength: number; about: string; second?: Family; query: string; own: Record<string,Family>; onWhen(w): void; onFam(f): void; onWord(w): void; onStrength(s): void; onAbout(a): void; onBlend(f?: Family): void; onQuery(q): void; onOwnWord(word: string, f: Family): void; onKeep(another: boolean): void })`
  - `FeelingPicker({ when, word })`, the container that returns to Today after keeping (except "Keep it, then add another");
  - `pinLabel(p): { disabled: boolean; label: string; sub: string }`, pure: exported for tests;
  - `FeelingCardView({ word, family, meaning, lang?, strength, close: string[], canRemove, where: string, onRemove, onClose, onOpenWord })`, and `FeelingCard` (the container, same props as the Task 11 stub).

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeelingPickerView, pinLabel } from '../src/screens/FeelingPicker';
import { FeelingCardView } from '../src/screens/FeelingCard';

const noop = () => {};
const props = { when: 'now' as const, fam: 'wistful' as const, word: 'nostalgic', strength: 3, about: '', query: '', own: {}, onWhen: noop, onFam: noop, onWord: noop, onStrength: noop, onAbout: noop, onBlend: noop, onQuery: noop, onOwnWord: noop, onKeep: noop };

describe('the save bar', () => {
  it('names what it keeps', () => expect(pinLabel(props)).toEqual({ disabled: false, label: 'Keep “nostalgic”', sub: 'Soft rain at dusk · right now' }));
  it('waits while searching, so it can never keep a hidden word', () => expect(pinLabel({ ...props, query: 'pooped' })).toMatchObject({ disabled: true, label: 'Pick a word first' }));
  it('says when it sets the day overall', () => expect(pinLabel({ ...props, when: 'day' }).sub).toBe('Soft rain at dusk · as the day overall'));
});
describe('the picker', () => {
  it('shows all nine families, the words of the chosen one and a real Now/Whole-day switch', () => {
    const html = renderToStaticMarkup(<FeelingPickerView {...props} />);
    for (const f of ['Bright', 'Proud', 'Curious', 'Calm', 'Warm', 'Wistful', 'Low', 'Tense', 'Heated']) expect(html).toContain(f);
    expect(html).toContain('nostalgic');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Right now/);
  });
  it('offers everyday meanings and keeping your own word while searching', () => {
    const html = renderToStaticMarkup(<FeelingPickerView {...props} query="pooped" />);
    expect(html).toContain('exhausted');
    expect(html).toContain('Keep “pooped” itself');
    expect(renderToStaticMarkup(<FeelingPickerView {...props} query="zzqq" />)).toContain('Keep “zzqq” as your own word');
  });
});
describe('the feeling card', () => {
  it('shows the meaning, family, strength and a Remove button', () => {
    const html = renderToStaticMarkup(<FeelingCardView word="calm" family="calm" meaning="Steady; nothing pulling at you." strength={2} close={['peaceful']} canRemove where="from this line" onRemove={noop} onClose={noop} onOpenWord={noop} />);
    for (const s of ['calm', 'Calm', 'Steady; nothing pulling at you.', 'Still air', 'strength 2 of 5', 'peaceful', 'Remove from this line']) expect(html).toContain(s);
  });
});
```

Run: `npx vitest run tests/picker.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement the picker**

Port the markup and behaviour of `pAdd`, `pinbar` and `feelingResults` from `design/pinboard8-source/p7-screens.js` into React:
- `FeelingPickerView` renders:
  - the header (back button: `go({name:'today'})`, and the title "How do you feel?");
  - the `.switch` with two `aria-pressed` buttons;
  - the search input (`type="search"`, `aria-label="Search all feelings"`);
  - when `query` is set, the results list (`searchFeelings(query, own, 9)`). Slang rows show `slangTargets` chips plus a dashed "Keep “x” itself" chip, and a final "Keep “q” as your own word. Which family is it closest to?" row with nine family chips when no result's word equals the query;
  - otherwise:
    - the nine `.ftile` family buttons, each with a `Form`;
    - the word card for the chosen word: meaning, "What it was about" nuance chips, and five `.rung` buttons (`aria-label="Strength k of 5: <ladder name>"`);
    - the family panel with `groupsOf(fam)` chips, words from other languages, own words, and blends (a blend chip toggles `second`).
- Word chips use `style={{'--fc': pal[fam], '--ff': solid(pal[fam]), '--fo': onColor(solid(pal[fam]))}}`.
- The `.pinbar` sits outside the scroll area: the primary `.btn.big` button shows `pinLabel(...)`, and "Keep it, then add another" is shown only when `when === 'now'`.

`pinLabel`:
```ts
export function pinLabel(p: { word: string; fam: Family; strength: number; query: string; when: 'now' | 'day'; own: Record<string, Family>; second?: Family }) {
  const sel = findWord(p.word, p.own), ok = !!sel && !p.query.trim();
  return ok ? { disabled: false, label: `Keep “${sel!.w}”${p.second ? ` with ${FAMILY_NAME[p.second].toLowerCase()}` : ''}`, sub: `${ladderName(p.fam, p.strength)} · ${p.when === 'now' ? 'right now' : 'as the day overall'}` }
    : { disabled: true, label: 'Pick a word first', sub: p.query.trim() ? 'Choose one from the list above' : 'Tap a word below' };
}
```

`FeelingPicker` (the container):
- holds the state `{ when, fam, word, strength, about, second, query }`, starting from props: a `word` from the route sets `fam` from `findWord`, and `when` comes from the route;
- `onOwnWord` calls `addOwnWord`, then selects the word;
- `onKeep(another)`:
  - when `when === 'now'`: `keepMoment(db, {word, family: fam, second, about: about || undefined, strength, at: new Date()})`, then `undo.show(r.undo, `Kept ${word} in your inner weather.`)`. If `another`, clear `about`, `second` and `query` and stay; otherwise go to Today.
  - when `when === 'day'`: `setOverall(db, dayKey(new Date()), {word, family: fam, strength})`, then `undo.show(u, `The day overall is now ${word}.`)`, then go to Today.

- [ ] **Step 3: Implement the card**

`FeelingCardView` ports `glossSheet` from `p7-screens.js`. It uses `<Sheet label={word}>` and shows:
- a `Form`, the word, and `FAMILY_NAME + ' · ' + FAMILY_INFO[f].holds` coloured with `inkOf(pal[f], GROUND.dark.solid, true)`;
- the meaning (with "From <lang>." for rare words);
- the strength, as five small rungs plus `<b>{ladderName}</b>, strength {s} of 5`;
- the "Close to" chips (`onOpenWord`);
- the buttons: `Remove {where}` (only if `canRemove`) and Close.

`FeelingCard` (the container):
- For slang, the meaning is `An everyday word. It usually means X or Y.`; for own words, `Your own word.`.
- `where` depends on the source: draft gives "from this line", entry gives "from this entry", moment gives "from today".
- Remove:
  - draft: calls an `onRemoveFromDraft(word)` prop that `LineWriter` supplies. Add it: `LineWriter` exposes `removeFeeling(word)`, which uses `removeFeelingToken` from Task 5 and shows `undo.show({ label: 'Removed', run: async () => setText(before) }, `Removed ${word} from your line.`)`. Wire it through `Today` by keeping the `LineWriter`'s remover in a ref.
  - entry: `removeFeelingFromEntry(db, id, word)`.
  - moment: `removeMoment(db, id)`.
  - Each shows its Undo, and the card then closes.
- Strength for a moment source is read from the moment row; otherwise it's the word's own strength.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/picker.test.tsx && npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/FeelingPicker.tsx src/screens/FeelingCard.tsx src/screens/LineWriter.tsx src/screens/Today.tsx tests/picker.test.tsx
git commit -m "feat: the feeling picker with a pinned save bar, and the feeling card with Remove"
```

---

### Task 13: The day page

**Files:**
- Replace: `src/screens/DayPage.tsx`
- Test: `tests/daypage.test.tsx`

**Interfaces:**
- Consumes: `drawBloomLine`, `drawScoreLine`, `DayMoment` (Task 9); `Scene` (Task 9); `Form`, `RichText` (export `RichText` from `Today.tsx` in this task); db; `getSettings`; `ladderName`, `FAMILY_NAME`.
- Produces:
  - `DayPageView({ day: string; style: 'bloom'|'score'; entries: Entry[]; moments: Moment[]; overall?: DayRow['overall']; own: Record<string,Family> })`
  - `DayPage({ day })`
  - `toDayMoments(moments: Moment[]): DayMoment[]`: hours measured from midnight, but moments between 0:00 and 4:00 count as 24 plus the hour, because they belong to the day before.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DayPageView, toDayMoments } from '../src/screens/DayPage';

const m = (word: string, family: 'calm' | 'warm', iso: string) => ({ id: 1, day: '2026-09-29', at: new Date(iso).getTime(), word, family, strength: 3 });
describe('the day page', () => {
  it('reads each moment once, in the story, with its time and weather name', () => {
    const html = renderToStaticMarkup(<DayPageView day="2026-09-29" style="bloom" entries={[]} moments={[m('calm', 'calm', '2026-09-29T09:10:00')]} own={{}} />);
    expect(html).toContain('9:10 am');
    expect(html).toContain('calm');
    expect(html).toContain('Calm, like still air');
    expect(html.match(/9:10 am/g)).toHaveLength(1);
  });
  it('an empty day says so and still offers writing about it later', () => {
    expect(renderToStaticMarkup(<DayPageView day="2026-09-20" style="score" entries={[]} moments={[]} own={{}} />)).toContain('Nothing kept on this day');
  });
  it('places late-night moments after the evening', () => {
    expect(toDayMoments([m('calm', 'calm', '2026-09-30T01:30:00')])[0].h).toBeCloseTo(25.5);
  });
});
```

Run: `npx vitest run tests/daypage.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

Port `dayScreen` and `storyItems` from `p7-screens.js`, for the `bloomline` and `score` styles only. In short:
- `DayPageView` renders:
  - the header: back to where you came from (`history.back()`), the date as a heading, and a "Written on" note is left out in Stage 1;
  - the hero: `<Scene animate className="dayhero" label="The day's colours, from morning to night" draw={(ctx,w,h,t) => style==='bloom' ? drawBloomLine(ctx, look, w, h, t, dms, overall?.family ?? dms[0]?.family ?? 'calm') : drawScoreLine(ctx, look, w, h, t, dms)} />`, plus the centre label `.dial-center` for Bloom when `overall` is set;
  - the story panel: for each moment in time order, a `Form`, the time (`timeLabel`), the word plus `about`, and `{FAMILY_NAME}, like {ladderName(...).toLowerCase()}`. Entries are woven in by time as `RichText` blocks;
  - an empty state: `<p className="entry">Nothing kept on this day.</p>`.
- `DayPage` loads the day's entries and moments, the day row, `settings.dayStyle` and own words with `useLiveQuery`.
- `toDayMoments`:
```ts
export const toDayMoments = (ms: Moment[]): DayMoment[] => [...ms].sort((a, b) => a.at - b.at).map(m => { const d = new Date(m.at), h = d.getHours() + d.getMinutes() / 60; return { h: h < 4 ? h + 24 : h, family: m.family, second: m.second, strength: m.strength }; });
```
- Check `drawBloomLine` and `drawScoreLine` with `h` up to 28: `ang(h)` wraps correctly; clamp Score's x to the right edge with `Math.min(right, X(hh))`.

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/daypage.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/DayPage.tsx src/screens/Today.tsx tests/daypage.test.tsx
git commit -m "feat: the day page (Bloom, outlined, or Score) with the story underneath"
```

---

### Task 14: The calendar (Days)

**Files:**
- Replace: `src/screens/Calendar.tsx`
- Test: `tests/calendar.test.tsx`

**Interfaces:**
- Consumes: `drawSmall`, `lookOf`, `Scene` (Task 9); `addDays`, `weekStartOf`, `parseDay`, `dayKey` (Task 2); `suggestedOverall` (Task 11); db; `Sheet`, `go`.
- Produces:
  - `monthGrid(month: string): (string | null)[]`: the leading blanks, Monday first, then every day of the month;
  - `CalendarView({ month: string; today: string; days: Record<string, { family: Family; count: number; first: boolean }>; open: string | null; onOpen(d: string | null): void; onMonth(m: string): void })`
  - `Calendar({ month })`

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarView, monthGrid } from '../src/screens/Calendar';

describe('month grid', () => {
  it('starts on Monday', () => {
    const g = monthGrid('2026-09'); // 1 September 2026 is a Tuesday
    expect(g[0]).toBeNull();
    expect(g[1]).toBe('2026-09-01');
    expect(g.filter(Boolean)).toHaveLength(30);
  });
});
describe('the Days tab', () => {
  const noop = () => {};
  it('labels each kept day in words, marks firsts and today, and shows a key', () => {
    const html = renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" days={{ '2026-09-12': { family: 'calm', count: 3, first: true } }} open={null} onOpen={noop} onMonth={noop} />);
    expect(html).toContain('aria-label="12 September: mostly calm, 3 moments, a first"');
    expect(html).toMatch(/class="mc today"/);
    expect(html).toContain('Each day shows the form of its main feeling');
    expect(html).toContain('Calm');
  });
  it('opens a day with the day before and after', () => {
    const html = renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" days={{ '2026-09-11': { family: 'warm', count: 1, first: false }, '2026-09-12': { family: 'calm', count: 3, first: true }, '2026-09-14': { family: 'low', count: 2, first: false } }} open="2026-09-12" onOpen={noop} onMonth={noop} />);
    expect(html).toContain('11 Sep');
    expect(html).toContain('14 Sep');
    expect(html).toContain('Open this day');
  });
});
```

Run: `npx vitest run tests/calendar.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement**

Port `calBody` (the `days` branch), `formKey` and `daySheet` from `p7-screens.js`:
- **Header:** the month name as a heading, and previous/next month icon buttons (44 px, `aria-label="Previous month"` and `"Next month"`).
- **Tabs:** `.ctabs` with Days selected. Gallery, Year, Life and Feelings are Stage 2, so don't render them yet.
- **Hint:** "Each day shows the form of its main feeling. ★ marks a first." Use the `first` icon, not a star character. In Stage 1, drop the span sentence.
- **Key:** `formKey` shows the families present, each as a glyph canvas (`<Scene draw={(ctx,w,h)=>drawSmall(ctx, look, f, w/2, h/2, Math.min(w,h)*0.4)} label="" />`) and its name.
- **Cells:** a button per kept day with the `aria-label` built as in the test, the day number, a small form and the first icon. Days with nothing kept are plain `.mc` spans; future days are `.mc future`; today is `.mc today`.
- **Day sheet:** `<Sheet>` with the date, the moments summary as words ("calm, then close") from the day's moments, and buttons: the previous kept day, "Open this day" (`go({name:'day', day})`), and the next kept day. Previous and next look only within the month.
- **`Calendar` container:** loads the month's moments and entries (`where('day').between(first, last, true, true)`) and the day rows. For each day, the family comes from `row.overall.family` if set, otherwise `suggestedOverall(moments)`; `count` is the moments length, and `first` is true if any entry has `marks.first`.

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/calendar.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Calendar.tsx tests/calendar.test.tsx
git commit -m "feat: the month calendar with small forms, a key and day sheets"
```

---

### Task 15: Settings, export, backup and the first run

**Files:**
- Replace: `src/screens/Settings.tsx`, `src/screens/FirstRun.tsx`
- Test: `tests/settings.test.tsx`

**Interfaces:**
- Consumes: `getSettings`, `saveSettings` (Task 6); `makeMarkdownZip`, `makeBackup`, `restoreBackup`, `BackupError` (Task 7); `parseStarter`, `applyStarter`, `StarterError` (Task 8); `VOICES`; `motion` (Task 9); `Form`.
- Produces:
  - `SettingsView({ settings, message, onVoice(i), onDayStyle(s), onTheme(t), onMotion(m), onExport(), onBackup(), onRestore(file: File), onStarter(file: File) })`
  - `Settings()`
  - `FirstRunView({ step: 1|2|3, message, onBegin(), onStarter(file), onSkip(), onDone() })`
  - `FirstRun()`
  - `saveFile(blob: Blob, name: string): Promise<void>`: uses `showSaveFilePicker` when available, otherwise an `<a download>`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsView } from '../src/screens/Settings';
import { FirstRunView } from '../src/screens/FirstRun';
import { DEFAULT_SETTINGS } from '../src/db/types';

const noop = () => {};
describe('settings', () => {
  it('has voices, the day page, theme, motion, export and backup, and states the day rules', () => {
    const html = renderToStaticMarkup(<SettingsView settings={DEFAULT_SETTINGS} message="" onVoice={noop} onDayStyle={noop} onTheme={noop} onMotion={noop} onExport={noop} onBackup={noop} onRestore={noop} onStarter={noop} />);
    for (const s of ['Archivist', 'Conspiracy theorist', 'Bloom', 'Score', 'Dark', 'Light', 'Still', 'Gentle', 'Export everything', 'Save a backup', 'Restore a backup', 'A day ends at 4 am', 'Weeks start on Monday', 'Text size follows your phone'])
      expect(html).toContain(s);
  });
  it('shows a plain message after a problem', () => {
    expect(renderToStaticMarkup(<SettingsView settings={DEFAULT_SETTINGS} message="This file isn’t a Logbook backup. Nothing was changed." onVoice={noop} onDayStyle={noop} onTheme={noop} onMotion={noop} onExport={noop} onBackup={noop} onRestore={noop} onStarter={noop} />)).toContain('role="alert"');
  });
});
describe('first run', () => {
  it('opens with the Archivist, then the starter file step, then the first line', () => {
    expect(renderToStaticMarkup(<FirstRunView step={1} message="" onBegin={noop} onStarter={noop} onSkip={noop} onDone={noop} />)).toContain('I’m the Archivist');
    const s2 = renderToStaticMarkup(<FirstRunView step={2} message="" onBegin={noop} onStarter={noop} onSkip={noop} onDone={noop} />);
    expect(s2).toContain('Your private starter file');
    expect(s2).toContain('Later');
    expect(renderToStaticMarkup(<FirstRunView step={3} message="" onBegin={noop} onStarter={noop} onSkip={noop} onDone={noop} />)).toContain('Tonight’s first line');
  });
});
```

Run: `npx vitest run tests/settings.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implement Settings**

Port `pSettings` from `p7-screens2.js`, keeping only the Stage 1 rows:
- **Voice:** eight chips, and the greeting shown below them.
- **Reading:**
  - The day page: Bloom or Score chips.
  - Light or dark: Dark or Light chips. Setting it writes `data-theme` on `<html>` from `App` on load and on change.
  - Motion: Still, Gentle or Lively. This sets `motion.speed` to 0, 1 or 2.2.
  - A static row: "Text size follows your phone’s text setting."
- **Your archive:**
  - "Export everything": `makeMarkdownZip`, then `saveFile(blob, 'logbook-export-YYYY-MM-DD.zip')`, then `saveSettings({lastExport: Date.now()})`.
  - "Save a backup": `makeBackup` as JSON, then `saveFile(..., 'logbook-backup-YYYY-MM-DD.json')`.
  - "Restore a backup": a hidden `<input type="file" accept="application/json">` behind a button. It asks `confirm('Replace everything in Logbook with this backup?')`, then calls `restoreBackup`; a `BackupError` message goes to `message`.
  - The "last export" date as a hint.
- **Starter file:** "Load your starter file" works like restore, calling `parseStarter` then `applyStarter`, with `StarterError` messages shown.
- **Days:** static rows "A day ends at 4 am" (Late nights count as the day before) and "Weeks start on Monday".
- **Message:** a message (`role="alert"`) appears when set.
- `saveFile`:
```ts
export async function saveFile(blob: Blob, name: string) {
  const w = window as unknown as { showSaveFilePicker?: (o: object) => Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }> };
  if (w.showSaveFilePicker) { try { const h = await w.showSaveFilePicker({ suggestedName: name }); const s = await h.createWritable(); await s.write(blob); await s.close(); return; } catch (e) { if ((e as Error).name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
```

- [ ] **Step 3: Implement the first run**

Port `firstRunMock` from `p7-demos.js`:
- **Step 1:** a large blooming Warm `Form`. Make the `Form` accept `bloom` so it scales up over 2.4 s, as in the pinboard `form` scene's `data-bloom`. Then the Archivist line "“Evening. I’m the Archivist. I keep the small things, so you don’t have to.”", "Everything stays on this phone unless you say otherwise.", and **Begin**.
- **Step 2:** "Your private starter file". It says names, homes and birthdays live in a file only you keep, and has **Choose the file** and **Later** buttons. Drive and location aren't in Stage 1, so they don't appear.
- **Step 3:** "Tonight’s first line", with the greeting and a button **Write it** that goes to Today.
- `onSkip` sets `localStorage.setItem('logbook-first-run-skipped', '1')`. Today checks it, as in Task 11.

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Settings.tsx src/screens/FirstRun.tsx src/App.tsx tests/settings.test.tsx
git commit -m "feat: settings (voice, day page, theme, motion), export, backup, restore and the first run"
```

---

### Task 16: Whole-app check, the size and legibility probe, and the first build

**Files:**
- Create: `tests/screens.test.tsx`, `scripts/probe.md` (the manual probe steps)
- Modify: `README.md` (add "Stage 1 includes …")

**Interfaces:**
- Consumes: every `…View` from Tasks 11–15.

- [ ] **Step 1: Write the whole-app render test**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayView } from '../src/screens/Today';
import { FeelingPickerView } from '../src/screens/FeelingPicker';
import { DayPageView } from '../src/screens/DayPage';
import { CalendarView } from '../src/screens/Calendar';
import { SettingsView } from '../src/screens/Settings';
import { FirstRunView } from '../src/screens/FirstRun';
import { DEFAULT_SETTINGS } from '../src/db/types';
import { FAMILIES } from '../src/vocab/vocab';

const noop = () => {};
const bad = /undefined|NaN|\[object Object\]/;
describe('every screen renders cleanly', () => {
  it('Today in both states, with and without data', () => {
    for (const night of [true, false]) for (const moments of [[], [{ id: 1, day: 'd', at: 0, word: 'calm', family: 'calm' as const, strength: 3 }]])
      expect(renderToStaticMarkup(<TodayView now={new Date('2026-09-29T23:00:00')} greeting="g" night={night} entries={[]} moments={moments} foldedOpen={false} onToggleFold={noop} onConfirmOverall={noop} onChangeOverall={noop} onOpenFeeling={noop} onEntryMenu={noop} writer={null} />)).not.toMatch(bad);
  });
  it('the picker for every family, now and whole day', () => {
    for (const fam of FAMILIES) for (const when of ['now', 'day'] as const)
      expect(renderToStaticMarkup(<FeelingPickerView when={when} fam={fam} word="" strength={5} about="" query="" own={{ mine: fam }} onWhen={noop} onFam={noop} onWord={noop} onStrength={noop} onAbout={noop} onBlend={noop} onQuery={noop} onOwnWord={noop} onKeep={noop} />)).not.toMatch(bad);
  });
  it('day page, calendar, settings and first run', () => {
    for (const style of ['bloom', 'score'] as const) expect(renderToStaticMarkup(<DayPageView day="2026-09-29" style={style} entries={[]} moments={[]} own={{}} />)).not.toMatch(bad);
    expect(renderToStaticMarkup(<CalendarView month="2026-02" today="2026-02-28" days={{}} open={null} onOpen={noop} onMonth={noop} />)).not.toMatch(bad);
    expect(renderToStaticMarkup(<SettingsView settings={DEFAULT_SETTINGS} message="" onVoice={noop} onDayStyle={noop} onTheme={noop} onMotion={noop} onExport={noop} onBackup={noop} onRestore={noop} onStarter={noop} />)).not.toMatch(bad);
    for (const step of [1, 2, 3] as const) expect(renderToStaticMarkup(<FirstRunView step={step} message="" onBegin={noop} onStarter={noop} onSkip={noop} onDone={noop} />)).not.toMatch(bad);
  });
});
```

Run: `npm test`. Expected: PASS.

- [ ] **Step 2: Run the legibility probe in the browser**

Write `scripts/probe.md`. It's the same probe the pinboard rounds used:
1. Run `npm run build && npm run preview`, open http://localhost:4174/#/today in Chrome device mode at 360 × 780, and load `tests/fixtures/starter.example.json` from Settings.
2. Keep three lines with feelings, open the day page, open the calendar, open the picker and a feeling card.
3. In DevTools, run the snippet below on each screen. Expected: `small` is empty, `tiny` is empty, `over` is false.
4. Repeat with Chrome's Settings → Appearance → Font size at "Very large". Expected: `over` is still false, and the tab labels are hidden.

```js
(() => { const small = [], tiny = []; document.querySelectorAll('body *').forEach(e => { if (e.closest('svg') || e.tagName === 'CANVAS') return; const r = e.getBoundingClientRect(); if (!r.width) return;
  const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (own && parseFloat(getComputedStyle(e).fontSize) < 12.95) small.push(e.className);
  if (e.matches('button, input:not([type=file]), textarea') && !e.matches('.tagchip, .mention, .feelchip') && (r.height < 43.5 || r.width < 43.5)) tiny.push(e.className); });
  const c = document.querySelector('.content'); return { small, tiny, over: c.scrollWidth > c.clientWidth + 1 }; })()
```

Fix anything the probe finds in `src/styles/app.css`, then rerun.

- [ ] **Step 3: Check the whole path on the phone-sized preview, by hand**

- **First run:** the form blooms, then Later, then Today.
- **Today at night:** fake the hour by setting the computer clock, or by temporarily passing `new Date('…T01:00')`. Only three things show, plus "Today so far".
- **Writing:** type `:poo`, pick "pooped", tap its chip, the card opens, Remove, Undo. Keep the line.
- **Keeping a feeling:** Add a feeling, search `mid` (the save bar is off), pick "bored" (the save bar is on), then Keep.
- **The day overall:** "That’s it", then Undo.
- **The day page:** it shows the story; Settings, then Score; the day page shows the Score line.
- **The calendar:** it shows today's form; open the day sheet.
- **Archive:** Export, and open the zip on the laptop to check the Markdown reads well. Save a backup, restore it into a fresh browser profile, and check everything is back.

- [ ] **Step 4: Update the README and commit**

In README's "Develop" section, add:
```markdown
Stage 1 (this build): Today, the writing box with # @ :, marks, Keep and Undo, the feeling picker and card,
the day overall, the day page (Bloom or Score), the month calendar, settings, Markdown export, backup and restore,
and the first run. Stages 2 and 3 are in docs/superpowers/specs/.
```

```bash
git add tests/screens.test.tsx scripts/probe.md README.md src/styles
git commit -m "test: whole-app render check and the legibility probe; Stage 1 complete"
```

- [ ] **Step 5: Stop and hand over**

Don't push. Tell the owner Stage 1 is ready, and ask whether to push to `pohtato-potato/logbook`. The repo must be created on GitHub first, with Pages set to "GitHub Actions", the same as Health.
