# Logbook: design spec

Date: 2026-09-30. Status: written for review.

The product brief is `PRODUCT.md`. The approved look is `design/logbook-pinboard-8.html` (Pinboard 8). This spec says what gets built and how it fits together. It holds **no personal data**: names, homes, birthdays, usernames and keys live only in the private starter file (section 12).

---

## 1. What Logbook is

Logbook is a low-effort personal archive that runs as an installed web app.

- Every entry takes one tap or one line. Missed days are normal.
- Its value builds over years, through looking back.
- It is the hub of a small family of apps. Health is built; Media, Places, Everyday Book and maybe People come later. They swap small daily "postcards" (section 10.3).

## 2. Ground rules

1. **Data lives on the phone.** There are no accounts and no server. The only copies anywhere else are the owner's own Google Drive backups.
2. **The code is public and holds no personal data.** Personal details arrive through the private starter file or are typed in the app.
3. **Nothing is loaded from outside the app.** Fonts and all the vocabulary data are bundled. The only network calls are to the named data sources in section 9, and each can be switched off.
4. **The archive outlives the app.** A plain Markdown and photo-folder export works from day one (section 11).
5. **The address never changes:** `https://pohtato-potato.github.io/logbook/`.
6. **No reminders, streaks, achievements, widgets or background location.**
7. **Feelings are never scored, diagnosed, ranked or charted as better or worse.** Looking back describes; it never judges.

## 3. Tools and repository

These are the same as Health, so the two apps are maintained the same way.

- **The app:**
  - Vite, React 19 and TypeScript.
  - Dexie over IndexedDB for the database.
  - `vite-plugin-pwa` for installing and working offline.
  - Vitest with `fake-indexeddb` for tests.
- **Fonts:** Atkinson Hyperlegible for all text, and Archivo (wide, extra-bold) for big numbers only. Both come from `@fontsource`, so nothing is fetched at run time.
- **Repository and publishing:**
  - The repository is `pohtato-potato/logbook`.
  - GitHub Actions runs the tests, builds and publishes to GitHub Pages on every push to `main`, the same workflow as Health.
  - `base: './'`; the manifest's `scope` and `start_url` are `./`.
  - Routes use a hash (`#/today`), as in Health.
- **Kept out of the repository** (in `.gitignore`, as in Health): `private/`, `logbook-starter*.json`, `logbook-backup-*`, exports, and `.claude/`. The dev server refuses to serve `private/`.
- **Shared website with Health:**
  - Logbook's IndexedDB database is `logbook`; Health's stays `health`.
  - Logbook's service worker only controls `/logbook/`. Its cache clean-up never touches Health's caches.
  - Logbook asks the browser for persistent storage on first run.

## 4. How the code is laid out

```
src/
  domain/      pure logic: dates and the 4 am day, feelings, colour rules, text tokens, stamps, export, looking-back summaries
  vocab/       the Feelings Atlas data and the everyday dictionary (from the approved Atlas and Pinboard 8)
  db/          Dexie schema, actions (keep, undo, remove), backup and restore
  sources/     one module per outside source: weather and air, sun, Last.fm, Drive, Timeline import, Photos, Health postcards
  draw/        canvas drawings: the nine Lines forms, small forms, the Bloom day page, the Score line, year ring and pixels, the drawn place map
  ui/          shared parts: tab bar, sheets, the Undo notice, chips, the writing box, the feeling card
  screens/     one file per screen (section 7)
  styles/      tokens and the app stylesheet
tests/
```

Domain logic stays free of React and the database, so most of it is tested directly.

## 5. Days and time

- **A day ends at 4 am.** Anything written before 4 am belongs to the day before. `dayKey(date)` returns `YYYY-MM-DD` for the logical day. It is the single source of truth, and it is tested around midnight, 4 am and time-zone changes.
- **Weeks start on Monday.**
- **Every entry stores its real time and its time zone,** plus its day key, so travel never shifts past entries.
- **"Written later":** an entry backdated to an earlier day keeps the date it was actually written and shows a "written later" stamp.

## 6. Data model (Dexie, database `logbook`, version 1)

| Table | What it holds | Key fields |
|---|---|---|
| `entries` | Everything kept: lines, media, quotes, places, keepsakes, voice notes, people-contacts, spans, things from before, things shared in | `id`, `day`, `at` (time), `tz`, `kind`, `text`, `marks{first,gift,private,quiet}`, `tags[]`, `people[]`, `feelings[]`, kind-specific `data`, `writtenAt` |
| `moments` | Feelings felt at a time ("right now") | `id`, `day`, `at`, `word`, `family`, `second?`, `about?`, `strength 1–5`, `entryId?` (when typed in a line) |
| `days` | One row per day: the day overall, photo of the day, stamps cache, headline | `day`, `overall{word,family,strength,set}`, `potd`, `stamps{}`, `headline?`, `grateful?` |
| `photos` | Photos kept on the phone as 1600 px JPEG blobs, with thumbnails | `id`, `day`, `blob`, `thumb`, `takenAt?` |
| `people` | People by id and initial only; names come from the starter file | `id`, `initial`, `thread` (the colour they were given), `birthday?` |
| `places` | Places with editable names and rough positions | `id`, `name`, `lat`, `lon`, `first`, `visits` |
| `tags` | Tag names; their colour is worked out, never stored | `name`, `created` |
| `words` | The owner's own feeling words | `word`, `family`, `created` |
| `spans` | Trips and stretches of days | `id`, `name`, `from`, `to`, `family` |
| `postcards` | Postcards received from other apps (Health first) | `id` (`app:day`), `app`, `day`, `version`, `data`, `receivedAt` |
| `settings` | One row of preferences | voice, day style, backup state, linked sources, homes (from the starter file) |

Rules:

- **Keeping a line** does three things:
  - it saves the entry;
  - it turns `:feeling` tokens into ONE moment at that time (the first word leads, a second family becomes `second`, the rest go in `about`);
  - it skips a feeling word already logged in the last hour.
- **Undo** reverses exactly what the last Keep, Remove or day-overall change did. It is shown as a notice until the next action.
- **Removing a feeling** from an entry removes the token from the text and its part of the moment.
- **Private entries** are not encrypted; as agreed, the phone's own lock protects the data. Inside the app they sit behind an unlock step that uses the phone's fingerprint or PIN (WebAuthn).
- **"Don't bring back"** entries are left out of On this day, Random day, Echoes and Wrapped. They stay in the calendar and in exports.

## 7. Screens

Everything follows Pinboard 8.

- **Today.** Two states.
  - **Night (12 am to 5 am): three things.** The line, inner weather and the day overall. Everything else folds into one "Today so far" row.
  - **During the day,** the sections are open, in this order: line, kept today, photos, inner weather, Health's postcard for yesterday, together today, song, stamps, on this day, grateful for.
  - **The header** holds the date, the "Outside:" weather line, the voice's greeting, and Search and Settings buttons.
- **The writing box.**
  - `#` suggests tags (or makes a new one), `@` suggests people, and `:` suggests feelings from the whole vocabulary.
  - A chosen feeling behaves as one piece: tapping it opens the feeling card, and one Backspace removes it.
  - Marks sit in a 2 × 2 grid. Keep is disabled while the box is empty. Ctrl + Enter keeps on the laptop.
- **The feeling picker.**
  - A Right now / The whole day switch.
  - A search over the whole vocabulary, including slang, typos and the owner's own words.
  - Nine family tiles, the word groups, nuances ("what it was about"), strength rungs, blends and words from other languages.
  - A save bar pinned at the bottom that names what it keeps, and stays off while searching. There is also "Keep it, then add another".
- **The feeling card:** meaning, family, strength, close words, and Remove (with Undo).
- **The + sheet:** feeling, photo, film/book/show (1–7 scale plus Currently), quote, place, person, keepsake, voice note, span, something from before. Feeling is the big button at the bottom.
- **The day page:**
  - Bloom, outlined (default) or Score, chosen in Settings.
  - The picture never repeats the moments; the story underneath is where each is read.
  - Echoes link to earlier days.
- **Calendar tabs:**
  - Days: each day's small form, first marks, span lines, a key, and a sheet with the day before and after.
  - Gallery: blooms.
  - Year: a ring or pixels. Tap or use the arrow keys, with day before and day after.
  - Life: the timeline.
  - Feelings: the nine families, words reached for, through the day, often together, and who you were with.
- **Shelves:**
  - firsts; films, books and shows; quotes; places (a drawn map);
  - keepsakes; birthdays and gifts; songs of the week; spans;
  - people and tags.
- **Person and tag pages:** described, never judged ("Together 41 days this year"). A person's colour thread can be changed.
- **Search:** lines, tags, people and feelings.
- **The Almanac:**
  - the masthead, then Report, Headlines, Wrapped, and A random day with then-and-now;
  - "Notable" instead of records;
  - the forecast appears only in the Conspiracy theorist's voice.
- **Settings:**
  - voice, day page, text size (follows the phone), backup, export;
  - privacy lock, homes, linked sources, days (4 am, Monday);
  - when something goes wrong (section 13).
- **First run:**
  1. A form blooms and the Archivist speaks.
  2. Three skippable steps: starter file, Drive, location once.
  3. The first line.
- **The laptop (1024 px and wider):**
  - a reading room: navigation, month and spans on the left; a writing column and the day in the middle; Health, stamps, people and keyboard keys on the right;
  - keys: `/` search, `N` write, `←` `→` days, `G` then `C` calendar.
- **Sharing in:** `share_target` in the manifest. A shared link, video or text opens a sheet to keep it as watched, a link or a quote, with a line of your own.

## 8. Look

The look follows Pinboard 8.

- **Dark by default.** The dark ground is `#0F1317`, with panels in a translucent card colour. Light is kept in the tokens and can be switched on in Settings. Luminous colours are used in dark, Pigment in light.
- **Type:** 16 px body, 14 px secondary, nothing under 13 px. Everything is in `rem`, so the phone's text-size setting scales it all. Above 100%, the tab bar shows icons only.
- **Targets:** every control is at least 44 px. Tags and names inside sentences may be 36 px.
- **Colour:**
  - The nine feeling colours belong to feelings, always with their form and word.
  - Tags take the colour of the feeling they most often come with (a new tag borrows today's). Marks keep their colours (First bright, Gift warm, Private calm, Don't bring back fog). Both always carry their symbol and word.
  - People get a soft thread colour the owner picks. Ratings have no colour.
- **Colour functions** (in `domain/colour`, all tested):
  - `onColor` picks the better of white or dark text;
  - `solid` deepens a fill when neither reaches 4.5:1;
  - `inkOf` gives a text-safe shade of a colour;
  - `mixOk` blends in OKLab, keeping chroma.
- **Forms:**
  - The nine Lines forms, with Warm as the rings and Tense as the two arms.
  - Below about 40 px they switch to the still silhouettes.
  - Motion is gentle by default, can be Still, and respects "reduce motion".
- **The Health postcard** is drawn in Health's own ink, rings and colours, and in Health's night colours after 11 pm.

## 9. Automatic stamps

Stamps are fetched when a day is first opened or written in, cached in `days.stamps`, and never block writing.

| Stamp | Source | Notes |
|---|---|---|
| Weather outside, rain | Open-Meteo forecast, and its archive for past days | Works back to 1940 for backdated days |
| Air quality, Indian scale | Open-Meteo air quality (pm10, pm2.5, NO₂, SO₂, CO, O₃) | Indian AQI computed from CPCB breakpoints in `domain`; about Aug 2022 onwards |
| Sunrise, sunset, day length, moon | Computed on the phone | No network |
| Distance from home | From the homes in the starter file, a different home each day until every home has had a turn | Needs location once per entry, never in the background |
| Place name | OpenStreetMap suggestion, always editable | Only when the owner asks |
| Song playing | Last.fm recent tracks | Both accounts from the starter file |
| Days at this home, next trip, age, special days | Computed from the starter file and spans | |

When offline, stamps fill in later and nothing is lost.

## 10. Linked sources

1. **Google Drive backup.**
   - Uses the `drive.file` scope and a visible Logbook folder. It makes a monthly zip of the export (section 11) plus the JSON backup.
   - Sign-in uses Google's OAuth for web apps, with the client ID from the starter file.
   - Access tokens last about an hour, so a backup asks for sign-in again when needed, and the "signed out" state is designed (section 13).
   - **Spike needed:** the smoothest re-sign-in inside an installed PWA.
2. **Last.fm.** Reads recent tracks and weekly charts for the song of the week and the song-playing stamp. The API allows any origin. **Check needed:** whether the older account is readable by username.
3. **Health postcards.**
   - Health writes one small, versioned postcard per day to a shared `shelf` IndexedDB database on the same website. Logbook reads it; each app owns only its own data.
   - The postcard holds steps, sleep, the workout, the check-in, India-walk progress and one line in Health's voice.
   - **A day's postcard arrives the next afternoon,** so entries added late are covered; Today shows yesterday's.
   - A contract test in both repos pins the postcard format. Health changes are made in Health's repo, separately and carefully.
4. **Google Maps Timeline import.** The owner exports Timeline from the phone and imports the file. Places and visits since 2022 are matched to days. **Check needed:** the current export format.
5. **Google Photos suggestions.** These show "taken today" suggestions. **Check needed:** Google restricted the Photos Library API in 2025, so this likely uses the Google Photos Picker. If no web route works, Today uses the phone's own photo picker only.

Every source can be switched off in Settings, and the app works fully with all of them off.

## 11. Export and backup

- **Export (from day one):** a zip with one Markdown file per day and a `photos/YYYY/MM/` folder.
  - The file is `YYYY/MM/YYYY-MM-DD.md`.
  - It has YAML front matter (the day overall, stamps, marks, tags, people as initials) and then entries in time order.
  - Feelings are written as words, never codes. Media, quotes and places are readable sentences.
- **Backup:** a JSON file of every table plus the photos, for exact restore on a new phone. Restore is tested.
- Both are saved with the phone's file picker or sent to Drive.

## 12. The private starter file

`private/logbook-starter.json` never goes in the repo. It holds:

- people (id, initial, name, birthday, thread colour);
- homes (name, rough location, from and to);
- Last.fm usernames and the Google OAuth client ID;
- optional past moments to backfill.

It is loaded once on first run from the phone's files, as in Health. A generator script can live in `private/`.

## 13. States and errors

These are designed now, not later:

- Empty days and first-week states.
- Offline: stamps pending, Drive waiting.
- Backup failed, Drive signed out, storage nearly full.
- Private entries locked.
- A source switched off.

Each one says what happened, that nothing is lost, and the one thing to do.

## 14. Testing

- **Vitest for all domain logic:**
  - the day key and 4 am rule;
  - tokens in a line and merging feelings into one moment;
  - Undo;
  - the colour functions, with every feeling colour checked at 4.5:1 or more;
  - vocabulary search (slang, typos, own words);
  - the Indian AQI;
  - the Markdown export;
  - backup and restore round trips;
  - the postcard contract.
- **Dexie tests** with `fake-indexeddb`.
- **A rendering smoke test,** as used for the pinboards: every screen and drawing in both themes and at 100/130/200% text.
- **Before each stage ships:** a check on the phone and on the laptop, and an `/impeccable audit`.

## 15. Build order

Each stage is usable on its own.

1. **Stage 1: the daily core.**
   - The project set-up, publishing, the starter file and the first run.
   - Today (both states), the writing box, marks, Keep and Undo, the feeling picker and card, inner weather and the day overall.
   - The day page (Bloom, Score), the calendar Days tab, Settings basics.
   - The Markdown export and the JSON backup.
2. **Stage 2: filling it out.**
   - Photos and the photo of the day, and every kind in the + sheet.
   - Shelves, person and tag pages.
   - Stamps (weather, air, sun, moon, distance, place names), search.
   - The Gallery, Year, Life and Feelings tabs, and the private lock.
3. **Stage 3: the connections.**
   - Google Drive backup, Last.fm, Health postcards (with the matching change in Health).
   - Timeline import, Photos suggestions, sharing in.
   - The Almanac (Report, Headlines, Wrapped, Random), echoes and on this day.
   - The laptop reading room.

## 16. Open items

These need a small spike before their stage, not now:

- **Drive:** sign-in and refresh inside an installed PWA.
- **Google Photos:** a web route for suggestions.
- **Timeline:** the export format.
- **Last.fm:** whether the older account can be read.
