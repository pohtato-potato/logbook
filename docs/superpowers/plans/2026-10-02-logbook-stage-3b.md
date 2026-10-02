# Logbook Stage 3b (The connections) Implementation Plan

> Executed inline (superpowers:executing-plans). The owner asked (2026-10-02) for **no per-stage review**: build everything, then one comprehensive review at the end. Per task: TDD, typecheck, browser check where it can be seen; open findings go to `docs/superpowers/reviews/backlog-for-final-review.md`.

**Goal:** the spec's remaining Stage 3 sources (section 10), each one optional, switchable off and honest when it isn't set up:
1. **Health postcards:**
   - Health writes one small, versioned postcard per finished day to a shared `shelf` IndexedDB database on the same website.
   - Logbook copies them into its own `postcards` table and shows yesterday's on Today, drawn in Health's ink.
   - A contract test in both repos pins the format.
2. **Last.fm:** the "Playing" stamp (the day's most-played track) and a "Songs of the week" shelf, for the usernames in the starter file.
3. **Google sign-in, Drive backup, Photos suggestions:**
   - Sign-in uses Google's web OAuth (token in a popup that returns to Logbook), with the client ID from the starter file. No Google script is loaded.
   - Drive keeps a monthly zip of the export plus the backup in a visible "Logbook" folder (`drive.file` scope).
   - Photos uses the Google Photos Picker to choose today's photos.
4. **Google Maps Timeline import:** the owner picks the exported Timeline file. Logbook shows what it found, then adds places and visits since 2022 to their days, with one Undo.

**Owner inputs (none are in the repo).** Everything works without them and says what's missing.
- In the private starter file: `googleClientId`, `lastfm` (usernames) and `lastfmKey`.
- In Google Cloud: an OAuth web client whose authorised redirect URI is the app's own address (`https://pohtato-potato.github.io/logbook/`, and `http://localhost:5174/` for testing), with the Drive API and Photos Picker API enabled.
- For Timeline: the owner's own export file.

**Network rules:**
- The allowed hosts grow from 4 to 8: `ws.audioscrobbler.com`, `www.googleapis.com`, `photospicker.googleapis.com` and `lh3.googleusercontent.com`. `accounts.google.com` is only ever a page the owner is sent to for sign-in, never fetched.
- The hosts test is updated to match.
- Each source has its own switch in Settings ("Songs", "Drive backup", "Google Photos"). Health postcards stay on the device, so they need no network and no switch.

## Tasks (each: failing test → code → test → commit)
1. **Linked sources plumbing.**
   - The starter file gains `lastfmKey`; it already has `lastfm` and `googleClientId`.
   - `settings.links = { lastfm: string[]; lastfmKey?: string; googleClientId?: string }`, filled when the starter file is loaded.
   - `sourcesOf` gains `songs`, `drive` and `photos` (all on by default, and they do nothing until set up).
   - Settings gains a "Linked sources" section: each source shows "Set up", "Not set up: needs … in your starter file", or "Switched off".
   - The hosts test lists 8 hosts.
2. **Health postcards in Logbook.**
   - `src/sources/shelf.ts`:
     - `POSTCARD_VERSION = 1`;
     - `parsePostcard(v)` validates the contract;
     - `readShelf()` uses raw IndexedDB `shelf`, store `postcards`, key `health:YYYY-MM-DD`;
     - `syncPostcards(db, read)` copies new or updated postcards into `db.postcards`.
   - `tests/fixtures/postcard-v1.json` is the contract.
   - Today shows "Postcard from Health, for yesterday" in the day order, after inner weather. It ports `healthPostcard` (three rings for workout, sleep and steps; rows; Health's line; Health's night colours after 11 pm), with every ring also in words.
   - At night it folds into "Today so far", whose summary adds "yesterday from Health".
3. **Health writes postcards** (Health repo, local branch `postcards`, never pushed).
   - `src/shelf/postcard.ts`: `buildPostcard(date, day, sessions, checkins, totalKm)` returns the same v1 shape, and `writePostcard`.
   - It runs on app start and when the app comes back, after 12:00, for yesterday (and backfills the last 7 finished days that have data).
   - The same fixture is a contract test in Health.
4. **Last.fm.**
   - `src/sources/lastfm.ts`: `recentUrl(user, key, from, to)`, `weeklyUrl(user, key)`, `parseRecent`, `parseWeekly`.
   - `ensureSong(db, day, now, get)` caches `days.stamps.song = { artist, track, plays, final }` from all usernames combined.
   - The "Playing" stamp shows it, and the Songs of the week shelf (`songs`) reads the weekly charts into Dexie v3 table `songs` (`week, artist, track, plays`).
5. **Google sign-in.**
   - `src/sources/google.ts`:
     - `authUrl(clientId, scopes, redirect, state)`;
     - `readTokenHash(hash)`;
     - `signIn(scopes)` opens a popup, and Logbook's own page posts the token back through `BroadcastChannel('logbook-auth')`;
     - `token(scopes)` returns a still-valid token from sessionStorage or null.
   - `main.tsx` handles `#access_token=…` at start: it passes the token on and closes the window.
   - States: "Signed in", "Signed out — sign in again to back up", "Sign-in was cancelled".
6. **Drive backup.**
   - `src/sources/drive.ts`: find or create the "Logbook" folder (with `drive.file`, only the app's own files are visible), and upload `logbook-YYYY-MM-export.zip` and `logbook-YYYY-MM-backup.zip` (multipart, replacing the month's files when re-run).
   - Settings has "Back up to Drive now" and shows the last Drive backup.
   - Today shows a gentle reminder when the month's Drive backup hasn't been made and Drive is set up.
7. **Google Photos suggestions.**
   - `src/sources/photos.ts`: `createSession`, `pollSession`, `listItems`, and `fetchItem(baseUrl + '=w1600')`, which goes into `addPhotos`.
   - "Choose from Google Photos" on Today's photos panel and the Photo form opens the picker; the chosen photos are added, with one Undo.
8. **Timeline import.**
   - `src/sources/timeline.ts` parses:
     - (a) the on-device export (`semanticSegments[].visit.topCandidate.placeLocation.latLng` "28.61°, 77.21°", plus `startTime`, `semanticType`);
     - (b) the older Takeout `timelineObjects[].placeVisit.location.latitudeE7`.

     It outputs `{ day, at, lat, lon, kind, name? }[]` from 2022 onwards.
   - The plan step groups visits into places within about 100 m.
   - The import adds places (named "Home" or "Work" from the semantic type, otherwise "A place near {nearest known place or rough coords}", which the owner renames) and one place entry per visit-day. Entries are marked `source: 'timeline'`, and one Undo removes the whole import.
   - Settings has "Import Google Maps Timeline", with a preview: "{n} visits on {d} days at {p} places, {from} to {to}."
9. **Whole-app check.** Render checks, the probe, a build, and the final comprehensive review (with the backlog).
