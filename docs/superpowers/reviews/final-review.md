# Logbook: final comprehensive review

Date: 2026-10-02. Branch `stage-3b` (7 commits ahead of `main`). This was a read-only pass over `src/`, `tests/`, the spec and the plans. Nothing was edited.
Checks run: `npx vitest run` gave 63 files and 397 tests, all passing. `npx tsc --noEmit` was clean.

Severity is graded by the effect on the person using the app. A breach of one of the owner's standing rules counts as at least Important. Every finding cites the code as it is on `stage-3b`, as `file:line`.

Counts: **2 Critical, 16 Important, 24 Minor**, and 6 items under "Declined to judge".

---

## Backlog status

These items were deferred from the Stage 3a review (`backlog-for-final-review.md`). Each one is listed as still present or fixed.

| # | Item | Status | Where | Graded below as |
|---|---|---|---|---|
| 1 | `maskPrivate` passes `link` data through, so a private link's title shows while locked | **Still present** | `src/domain/looking.ts:106` (the `link` kind falls to `: d`) | Critical C2 |
| 2 | People from private lines show while locked (Report, headline suggestion, Wrapped "Together", Desk "Together today") | **Still present**, and in more places: the Feelings tab "Who you were with" and the Person page count | `looking.ts:107` keeps `people`; `almanac.ts:31-36`, `almanac.ts:54`, `draw/cards.ts:30`, `screens/Desk.tsx:51`, `screens/calendar/Feelings.tsx:62`, `screens/Person.tsx:54` | Important I10 |
| 3 | Echoes point at a private feeling while locked | **Still present** | `screens/DayPage.tsx:72` passes raw `data.all`/`data.allEntries`; `domain/almanac.ts:83-86` has no private filter | Important I11 |
| 4 | "a private feeling" can be counted as the top word (Wrapped Words, Report Notable) | **Still present** | `draw/cards.ts:28`, `domain/almanac.ts:42` (`wordCounts` of masked moments) | Minor M1 |
| 5 | Wrapped "mostly" line can be untrue | **Still present** | `draw/cards.ts:19-21` | Minor M2 |
| 6 | A share with no title but some text keeps "Link: youtu.be" and loses the text | **Still present** | `screens/ShareSheet.tsx:38` | Important I15 |
| 7 | "Your line" is shown but dropped for "A quote" and "Watched" | **Still present** | `screens/ShareSheet.tsx:34`, `:37` | Important I14 |
| 8 | Desk calendar day squares are about 25–29 px wide | **Still present** | `styles/app-desk.css:2`, `:14`, `:16`, `:26` | Important I13 |
| 9 | Keys act while a dialog is open; `e.repeat` is not ignored | **Still present** | `ui/keys.ts:23-33` | Minor M3 |
| 10 | `cardPng` has no fallback without OffscreenCanvas | **Still present** | `draw/cards.ts:57-59` | Minor M4 |
| 11 | Canvas and CSS ask for `'Archivo'`; the loaded family is `"Archivo Variable"` | **Still present**, and Stage 3b added one more | `draw/cards.ts:52`, `styles/app.css:28`, `styles/app-2c.css:31`, `styles/app-desk.css:5`, `styles/app-3b.css:7` | Minor M5 |
| 12 | Film-form prefill reads and removes sessionStorage during render | **Still present** | `screens/forms/FormScreen.tsx:34` | Minor M6 |
| 13 | Report says "1 day kept / 0 moments"; ties say "turns up most on Mondays"; Random day's form can come from a quiet line; "Another day" can repeat | **Still present** | `domain/almanac.ts:28`, `:35`; `screens/Almanac.tsx:102`; `domain/almanac.ts:75-77` | Minor M7 |
| 14 | A URL found in text keeps a trailing `)` or `.`; unsafe addresses are stored as `''` | **Still present** | `share.ts:11`; `screens/ShareSheet.tsx:38` | Minor M8 |
| 15 | `thenAndNow` is unused (the Almanac rebuilds it inline) | **Still present**: only `tests/almanac-numbers.test.ts:28` uses it | `domain/almanac.ts:78-81` | Minor M9 |

None of the 15 backlog items has been fixed.

---

## Critical

### C1. The service worker is never registered, so the installed app does not open without a connection
- **Where:** `vite.config.ts:16-17` sets `registerType: 'prompt'` and `injectRegister: false`. Nothing in `src/` or `index.html` imports `virtual:pwa-register` or calls `navigator.serviceWorker.register`. The built `dist/index.html` and `dist/assets/index-*.js` contain no reference to `sw.js`, although `dist/sw.js` is generated. The same set-up has been there since the first commit (`b8ec254`, `src/main.tsx`).
- **What goes wrong:** The owner opens Logbook on the phone with no signal (on a train, or in flight mode). The browser shows its own offline error page instead of Today, so the owner cannot write the day's line at all. Spec section 3 promises `vite-plugin-pwa` "for installing and working offline", and section 13 designs "Offline: stamps pending". None of that can show, because the app shell never loads offline. Updates also never use the "prompt" flow.
- **Fix:** In `main.tsx`, `import { registerSW } from 'virtual:pwa-register'` and call it, with an "update ready" notice, or set `injectRegister: 'auto'`. Add a test that the built `index.html` or bundle registers `sw.js`.

### C2. A private link's title shows while locked (backlog #1)
- **Where:** `src/domain/looking.ts:106`. `maskPrivate` rewrites `media`, `quote`, `keep` and `voice`, but returns `d` unchanged for `link`. `entryLine` then prints `Link: ${d.title || hostOf(d.url)}` (`domain/entryText.ts:34`).
- **What goes wrong:** The owner shares an article into Logbook, keeps it as a link and marks it First and Private. While locked, its title appears in several places:
  - Report "Notable": "the day you marked to keep: …, Link: <title>" (`almanac.ts:45`).
  - The Wrapped "Firsts" card, and the PNG saved from it (`cards.ts:25`).
  - The Firsts shelf, and gifts on the Birthdays shelf (`Shelves.tsx:71`, `:87`).

  The host also shows (`hostOf(url)`). This breaks standing rule 3. `tests/lock.test.tsx:42-48` checks only a line and a quote, so it misses the case.
- **Fix:** In `maskPrivate`, map `link` to `{ kind: 'link', url: '' }` (and decide on `place`, whose name also prints). Add a `link` entry to the lock test.

---

## Important

### I1. The OAuth return page keeps any token without checking `state`, so a crafted link can make "Back up to Drive" upload the whole archive to someone else's Drive
- **Where:** `src/sources/google.ts:27-31`. `handleAuthReturn` calls `keep(...)` for any `#access_token=…` in the address, whatever its `state`. Only the BroadcastChannel listener in `signIn` checks state (`:44`). When pop-ups are blocked, the redirect fallback (`:46`) never stores the state anywhere, so the check cannot happen on that path. `signIn` then returns the kept token without asking (`:38` → `token()` → `usableToken`).
- **What goes wrong:** The repo is public, so the app's address is known. Someone sends the owner a link like `https://pohtato-potato.github.io/logbook/#access_token=<attacker's token>&expires_in=3599&scope=https://www.googleapis.com/auth/drive.file&state=x`. The owner opens it, and that tab now holds the attacker's token for an hour and lands on Settings. If the owner taps "Back up to Drive now" in that tab, the archive goes to the attacker's Drive:
  - after unlocking, the whole Markdown export and the full backup, including every private entry, photo and voice note, plus `settings` (Last.fm key, client ID);
  - the upload lands in the attacker's "Logbook" folder;
  - the owner sees "Backed up to Drive: …".

  This breaks standing rules 1 and 3 silently.
- **Fix:**
  - Before opening the popup or redirecting, write the `state` to sessionStorage (or localStorage, for the popup).
  - In `handleAuthReturn`, keep or post the token only when its state matches a pending one, and always drop unknown tokens.
  - Add a test for `handleAuthReturn` with a wrong state.

### I2. A real-sized Drive backup cannot finish: one multipart request per zip, with a 60-second cut-off, and the failure is reported as "try again"
- **Where:** `src/sources/http.ts:13` (`setTimeout(() => ac.abort(), 60_000)` around the whole request); `src/sources/drive.ts:20-21` (`uploadType=multipart` with the entire zip in one body); `drive.ts:25` builds both zips fully in memory first. `screens/Settings.tsx:88` turns the resulting `OfflineError` into "That didn’t work. Nothing was changed; try again."
- **What goes wrong:** After some months of photos and voice notes, the zips are hundreds of MB, and the photos are in both zips. At a typical 5–10 Mbit/s phone upload, the request is aborted at 60 s every time, and the owner is told to "try again" forever. Google also documents multipart for files of "5 MB or less". The monthly reminder on Today (`Today.tsx:74`) then never clears. This breaks standing rule 8 ("says so plainly") and the spec's Drive promise (section 10.1).
- **Fix:** Use a resumable upload session (`uploadType=resumable`) in chunks, with a per-chunk timeout instead of a whole-request one, and progress shown. Map a timeout to "The upload was too slow; nothing on the phone changed", not to a generic message.

### I3. Any 403 is treated as "signed out", and a refused token is never cleared, so "Sign in again" cannot work and a full Drive is reported as a sign-in problem
- **Where:** `src/sources/http.ts:16` (`401 || 403` → `SignedOutError`); `src/sources/google.ts:24` (`signOut` is defined but never called anywhere, as a grep shows); `google.ts:38` (`signIn` returns the kept token if it has not expired).
- **What goes wrong:**
  - **Drive is full:** Drive answers 403 `storageQuotaExceeded` (or 403 `userRateLimitExceeded`). The owner sees "Signed out of Google. Sign in again to carry on", which is untrue.
  - **Access was revoked:** The owner revoked access in their Google account, so the token is refused. They tap "Back up to Drive now" again, and `signIn` hands back the same refused token from sessionStorage without showing Google. The result is the same error for up to an hour, with no way to follow the advice.
- **Fix:** Treat only 401 (and 403 with reason `authError`, `insufficientPermissions` or similar) as signed out, and call `signOut()` before throwing. Read Drive's error reason for 403 and say "Your Google Drive is full" for `storageQuotaExceeded`.

### I4. Google Photos: the picker window is opened after `await`s, so it is blocked on first use and the owner is told "No photos were chosen."
- **Where:** `src/ui/googlePhotos.ts:14-16`. It awaits `getSettings`, then `signIn` (which opens its own popup and so uses up the tap's user activation), then `pickPhotos`. `pickPhotos` awaits `POST /sessions` before `window.open` (`src/sources/photos.ts:12-14`). If `open` returns `null`, the loop at `photos.ts:19` returns `[]` after the first poll. `googlePhotos.ts:17` then says "No photos were chosen."
- **What goes wrong:** The first time in a session (no token yet), the owner taps "Choose from Google Photos" and signs in. The picker never appears, and the notice says "No photos were chosen." That is untrue, because the owner never saw a picker. The same can happen with a token if the session request is slow.
- **Fix:**
  - Open the picker window synchronously in the tap handler (`window.open('about:blank', …)`), then set its `location` once the session exists.
  - Or, when `open` returns null, return a distinct result and say "Your browser blocked Google’s window. Tap again to open it."
  - Add a test with `open` returning `null`.

### I5. Switching a linked source off does not stop it mid-flight (Songs, Drive, Google Photos)
- **Where:**
  - **Songs:** `src/db/songs.ts:16-22`. The switch is read once in `ready()`, and the stamp is written after the fetch without checking again. `songs.ts:28-37`: `ensureWeeks` loops up to 12 weeks, each one a round of requests to every account, and never checks the switch again.
  - **Drive:** `src/sources/drive.ts:23-28` never checks `sourcesOf(...).drive` once it has started.
  - **Photos:** `src/sources/photos.ts:16-26` polls for up to 15 minutes and then downloads and stores the photos, without checking `sourcesOf(...).photos`.

  Compare `src/db/stamps.ts:36`, `:39` and `FormScreen.tsx:43`, which do check again.
- **What goes wrong:** The owner opens the Songs shelf, which starts 12 rounds to Last.fm, and switches Songs off at once. Logbook keeps calling Last.fm for every remaining week and storing the answers. In the same way, a Drive upload or a Photos poll carries on after its switch is turned off. This breaks standing rule 1 ("the switch must actually stop it, including mid-flight").
- **Fix:** Check `sourcesOf(await getSettings(db)).<source>` again before each request and before each write, and return `'off'` (dropping the answer). For Drive and Photos, also give the code an `AbortSignal` that the switch triggers.

### I6. One unreadable Last.fm account silently blanks songs for every account
- **Where:** `src/db/songs.ts:20` and `:33` use `Promise.all(r.users.map(...))`. Any one rejection becomes `'offline'` for the whole day or week, and nothing is cached.
- **What goes wrong:** The spec itself flags "whether the older account is readable by username" (section 10.2). If that account is private, renamed or deleted, Last.fm answers with an error status. `fetchJson` turns that into `OfflineError`, so the "Playing" stamp never appears for any day and the Songs shelf stays empty. The shelf then says "Songs of the week come from Last.fm, once it is set up in your starter file" (`Shelves.tsx:30`), which is untrue because it is set up. The retry happens on every view, for ever.
- **Fix:** Use `Promise.allSettled`, combine the accounts that answered, and remember which username failed so Settings can say "Last.fm couldn’t read ‘old’".

### I7. The Markdown export leaves out Health postcards, songs and the weekly headlines
- **Where:** `src/db/exportMarkdown.ts:16` reads only entries, moments, days and photos. `src/domain/markdown.ts:20-46` writes overall, weather, air, tags, people and marks into the front matter, and entries, feelings, photos and grateful into the body. It never writes:
  - `row.stamps.song` (the day's "Playing" song);
  - `row.headline` ("this week in a line", kept on each Sunday's row by `actions.ts:147-152`);
  - the `postcards` table;
  - the `songs` table (songs of the week).
- **What goes wrong:** If the app is lost in 2035, the Markdown archive has no weekly headlines (which the owner typed by hand), no Health postcards and no songs. This breaks standing rule 6, which names postcards and songs.
- **Fix:**
  - Add `song:` and `headline:` to the front matter.
  - Add a "## Postcard from Health" section to each day, from `db.postcards`.
  - Add a `songs.md` at the root, one line per week.
  - Extend `tests/export*.test.ts` to cover each.

### I8. The backup leaves out the `songs` table, so songs of the week older than 12 weeks are lost on restore
- **Where:** `src/db/backup.ts:7`. `TABLES` lists 11 tables but not `songs` (added in Dexie v3, `db.ts:36`). `ensureWeeks` refetches only the last 12 finished weeks (`songs.ts:27`).
- **What goes wrong:** The owner moves to a new phone and restores. Every song of the week older than about three months is gone. The same is true of the Drive copy. This breaks standing rule 6.
- **Fix:** Add `'songs'` to `TABLES` and to `OPTIONAL`, so older backups still restore. Add `songs` to the round-trip test.

### I9. The Almanac and Wrapped turn places, people and spans into wrong sentences ("Place: a place that was removed")
- **Where:**
  - `src/domain/almanac.ts:45` (Report Notable) uses `entryLine(first, EMPTY_LOOKUP)`.
  - `src/draw/cards.ts:25` (Wrapped Firsts) does the same.
  - `src/screens/Almanac.tsx:83` (`lineOf`, used for the Random day and "now") and `:105` (Then and now) do the same.
  - With an empty lookup, `entryText.ts:28` returns "Place: a place that was removed.", `:32` returns "Span: a span that was removed.", and `personName` returns "Friend R".
- **What goes wrong:**
  - The owner marks a new café as a First. Report says "the day you marked to keep: 3 May, Place: a place that was removed". The Wrapped Firsts card (and its saved picture) says the same. "Saw Friend R" replaces the person's name.
  - After a Timeline import, most random days and "then" lines are place entries, so this untrue sentence becomes the usual one.
- **Fix:** Load the lookup (`loadLookup(db)`) in the Almanac's live query and pass it to `yearReport`, `wrappedCards` and `lineOf`. Never call `entryLine` with `EMPTY_LOOKUP` on real data.

### I10. People from private lines show while locked (backlog #2)
- **Where:** `src/domain/looking.ts:107` keeps `people` on masked entries. They then appear in:
  - Report "R turns up most on …" (`almanac.ts:31-36`);
  - the headline suggestion "…, with R" (`almanac.ts:54`);
  - the Wrapped "Together" card (`cards.ts:30`);
  - Desk "Together today", which reads raw entries (`Desk.tsx:51`);
  - the Feelings tab "Who you were with" (`calendar/Feelings.tsx:62` passes unfiltered `entries` to `peopleWith`);
  - the Person page "Together N days", which counts private lines (`Person.tsx:54`).
- **What goes wrong:** A private line "@R and I talked about the move" is hidden on Today. Yet Wrapped shows "Together: Riya, 1 day together this month", and the laptop's right column shows R's face for that day. Standing rule 3 names "private lines' people" explicitly, so this is a ruling, not a question.
- **Fix:** In `maskPrivate`, set `people: []`. Filter `!(locked && e.marks.priv)` in `Desk.tsx:51`, `Feelings.tsx:62` and the Person page's `togetherStats` input.

### I11. Echoes reveal a private feeling while locked (backlog #3)
- **Where:** `src/screens/DayPage.tsx:72` passes the raw earlier moments (`data.all`) and entries to `echoesOf`. `echoFor` (`domain/almanac.ts:83-86`) skips quiet lines but not private ones.
- **What goes wrong:** On 2 October (an open line) the owner felt "lonely". On 14 September, "lonely" was in a private line. While locked, the day page says "Echo: you felt lonely on 14 September too", so the private line's feeling is shown and linked. This breaks standing rule 3.
- **Fix:** Pass `maskMoments(data.all, data.allEntries, locked)` to `echoesOf`. Masked moments then become `PRIVATE_FEELING` and never match a word.

### I12. Settings reports a full phone as "try again"
- **Where:** `src/screens/Settings.tsx:88`. `act` passes through only `BackupError`, `StarterError` and `PlainMessage`. `StorageFullError` (name `'StorageFullError'`, from `importTimeline`'s `guard`, `db/timeline.ts:10`) becomes "That didn’t work. Nothing was changed; try again." `restoreBackup` (`db/backup.ts:36`) and `applyStarter` are not wrapped in `guard` at all.
- **What goes wrong:** The owner imports years of Timeline visits, or restores a large backup onto a nearly full new phone. They are told to try again, which fails the same way each time. This breaks standing rule 8 ("a full disk says so plainly").
- **Fix:** Use `failMessage(e)` from `ui/Undo.tsx` (it already knows `StorageFullError`) in `act`. Wrap `restoreBackup` and `applyStarter` in `guard`.

### I13. Desk calendar day squares are narrower than 44 px (backlog #8)
- **Where:** `src/styles/app-desk.css`:
  - `:2` and `:26` set the left column to 14–16 rem, or 12–13 rem below 1200 px;
  - `:14` makes it a 7-column grid with a 3 px gap;
  - `:16` sets only `min-height:2.75rem` on the buttons.
- **What goes wrong:** At 1024–1199 px each day is about 25 px wide; at 1200 px and up, about 29 px. A low-vision owner with a mouse or trackpad must hit a 25 px target. This breaks standing rule 7.
- **Fix:** Give `.lp-cal` its own minimum (`grid-template-columns: repeat(7, minmax(2.75rem, 1fr))`) and let the left column grow (`minmax(21rem, …)`), or show the month as a list below a breakpoint.

### I14. Sharing in: the line the owner types is dropped for "A quote" and "Watched"
- **Where:** `src/screens/ShareSheet.tsx:34`. "Watched" stores only the title in sessionStorage; `line` is lost. `:37`: "A quote" is kept with `text: shared.text`, and `line` is never saved. The field "Your line (optional)" is shown for all three (`:25`).
- **What goes wrong:** The owner types "Mum read this out at dinner", picks "A quote" and taps Keep. The quote is kept and the owner's words vanish without a word. This is silent data loss.
- **Fix:** Store `line` in the quote entry (`data.where`, or the text after the quote), and prefill it as the media note for "Watched", or hide the field for kinds that cannot keep it.

### I15. Sharing in: a share with text but no title loses the text (backlog #6)
- **Where:** `src/screens/ShareSheet.tsx:38`. For a link, only `shared.title` (when present) and the owner's `line` are kept; `shared.text` is dropped. `share.ts:11` has already removed the URL from the text.
- **What goes wrong:** YouTube and many apps share `text = "<video title> https://youtu.be/…"` with no title. The kept entry reads "Link: youtu.be." and the video's title is gone.
- **Fix:** Use `title: shared.title || shared.text.slice(0, 200)`, as the backlog suggested, and keep any further text with the owner's line.

### I16. The Timeline import stores exact positions
- **Where:** `src/db/timeline.ts:14` adds places with `lat: p.lat, lon: p.lon` at full Timeline precision (7 decimals; see `tests/timeline.test.ts:20`, `lat: 10.0010001`). Every other place is rounded to about 100 m (`domain/geo.ts:2` "Positions are kept to about 100 m"; `FormScreen.tsx:59`; `stamps.ts:57`).
- **What goes wrong:** The exact door position of "Home" and "Work" goes into `places.md` in every export (`exportMarkdown.ts:10`) and into each monthly Drive copy. The spec's data model says "places with … rough positions". The coarse rule for sending (standing rule 1) still holds, because Open-Meteo gets `r2`, so this is about what is kept and copied.
- **Fix:** Use `roundCoord` on lat and lon in `planImport`/`importTimeline`, and match within 100 m on the rounded values.

---

## Minor

- **M1. "a private feeling" can be the top word (backlog #4).**
  - Where: `draw/cards.ts:28`, `domain/almanac.ts:42`.
  - What goes wrong: while locked, Wrapped can show "Words: a private feeling, Named 5 times this month", and Report can say "times you named a private feeling".
  - Fix: filter `m.word !== PRIVATE_FEELING` before `wordCounts`.
- **M2. The Wrapped "mostly" line can be untrue (backlog #5).**
  - Where: `draw/cards.ts:19-21`.
  - What goes wrong: "most of them on #walk days" is said when one of ten days had #walk; "most of them …" is said for a single moment.
  - Fix: say it only when the tag covers more than half the days and there are at least 3 moments; otherwise use the part of the month.
- **M3. Laptop keys act under an open dialog (backlog #9).**
  - Where: `ui/keys.ts:23-33`.
  - What goes wrong: with a FeelingCard sheet open, `N` focuses the textarea behind it and `/` navigates away. Held keys repeat moves.
  - Fix: return early when `document.querySelector('[aria-modal="true"]')` is present or when `e.repeat` is set.
- **M4. Wrapped "Save as picture" fails on browsers without OffscreenCanvas (backlog #10).**
  - Where: `draw/cards.ts:57-59`.
  - What goes wrong: the save throws and shows "That didn’t save".
  - Fix: fall back to `document.createElement('canvas')` and `toBlob`, as `domain/image.ts:3-5` already does.
- **M5. Big numbers use the wrong font family (backlog #11).**
  - Where: `'Archivo'` is used where the loaded family is `"Archivo Variable"`: `draw/cards.ts:52`, `styles/app.css:28`, `app-2c.css:31`, `app-desk.css:5`, `app-3b.css:7` (new, the Health postcard numbers).
  - What goes wrong: the big numbers fall back to the body font, unlike the approved look.
  - Fix: use `var(--num)` in CSS, and `"Archivo Variable"` on the canvas.
- **M6. The film-form prefill runs during render (backlog #12).**
  - Where: `screens/forms/FormScreen.tsx:34`.
  - What goes wrong: the IIFE reads and removes `logbook-media-title` on every render, so under StrictMode in development the shared title can be lost.
  - Fix: use a lazy `useState(() => …)` initializer and remove the key in an effect.
- **M7. Almanac wording slips (backlog #13).**
  - What goes wrong, and where:
    - "0 moments" under "1 day kept" (`almanac.ts:28`);
    - "turns up most on Mondays" when weekdays tie at 1 (`:35`);
    - Random day's form can come from a quiet line's moment (`Almanac.tsx:102`, `dayFamilies(d.moments, …)` is unfiltered);
    - "Another day" can pick the same day again (`almanac.ts:75-77`).
  - Fix: drop the sub-line at 0, say a weekday only on a strict maximum, filter quiet moments, and exclude the current pick.
- **M8. Shared URLs (backlog #14).**
  - Where: `share.ts:11` (`/https?:\/\/\S+/`); `ShareSheet.tsx:38` (`safeUrl(...) ?? ''`).
  - What goes wrong: a URL found in text keeps a trailing `)` or `.`. An unsafe address is stored as `''`, so even its text is gone.
  - Fix: trim trailing punctuation; keep an unsafe address as plain text in `title` or the line.
- **M9. `thenAndNow` is dead code (backlog #15).**
  - Where: `domain/almanac.ts:78-81`.
  - What goes wrong: only a test uses it; the Almanac rebuilds the logic inline.
  - Fix: use it in `Almanac.tsx:102-105` or delete it with its test.
- **M10. Health's night colours don't switch at 11 pm.**
  - Where: `screens/Today.tsx:75` uses `p.now.getHours() >= 23`. `useNow` (`ui/useNow.ts:11`) only replaces `now` when the day or the 12–5 am night state changes.
  - What goes wrong: a Today opened at 9 pm keeps Health's day colours until 4 am.
  - Fix: add an `after11` part to `clockKey`.
- **M11. The Songs shelf says "once it is set up" when Songs is set up but off or offline.**
  - Where: `Shelves.tsx:30`, `:111`. The status returned by `ensureWeeks` is thrown away.
  - Fix: keep the status and show "Songs are switched off in Settings", "Waiting for a connection" or "Not set up".
- **M12. Busy days lose plays.**
  - Where: `sources/lastfm.ts:4` requests `limit: 200` and reads only page 1.
  - What goes wrong: a day with more than 200 scrobbles on one account undercounts, and the day's song can be wrong.
  - Fix: follow `@attr.totalPages`.
- **M13. A comment in `songs.ts` is wrong.**
  - Where: `db/songs.ts:10`.
  - What goes wrong: it says "Local midnight", but the code (`parseDay` is noon, minus 8 h) gives 4 am, which is correct. A future editor could "fix" the code to match the comment.
  - Fix: correct the comment.
- **M14. Timeline entries get today's time zone.**
  - Where: `db/timeline.ts:17` (`tz = timeZone()`).
  - What goes wrong: a visit made abroad shows its time in today's zone (`KeptCard.tsx:67`, Markdown `timeLabelIn`).
  - Fix: keep the offset from `startTime` and map it to a zone, or store `tz` as an offset string.
- **M15. Sign-in without BroadcastChannel.**
  - Where: `google.ts:30` claims a fallback, but `keep()` in the popup writes to the popup's own sessionStorage, which the opener cannot read, and `signIn` (`:42`) throws inside the Promise executor.
  - What goes wrong: on old browsers, signing in fails with a generic error.
  - Fix: check for support and say so, or post to `window.opener`.
- **M16. "Back up to Drive now" has no busy guard.**
  - Where: `Settings.tsx:97-100`.
  - What goes wrong: a double tap runs two backups at once, and can create two "Logbook" folders (`drive.ts:13-16`).
  - Fix: add a `busy` ref, as `FormScreen.tsx:23` does.
- **M17. Background writes fail silently.**
  - Where: `syncPostcards` (`Today.tsx:84`) and `ensureSong` (`useStamps.ts:22`) write without `guard`, and their promises are `void`ed. `ensureSong`'s catch reports a full disk as `'offline'`.
  - What goes wrong: on a full phone these fail with unhandled rejections or untrue statuses.
  - Fix: catch, and surface `StorageFullError` once.
- **M18. The redirect fallback for sign-in loses the tap.**
  - Where: `google.ts:46`, `location.assign(url)`.
  - What goes wrong: with the private lock on, the passkey prompt usually outlasts the tap's activation, so the popup is blocked and the page goes to Google. On return, the owner lands on Settings with no message and must tap, and unlock, again.
  - Fix: open the popup before `opened()`, or show "Signed in. Tap Back up to Drive now again" after `handleAuthReturn`.
- **M19. Google Photos lands on whatever day it is when picking finishes.**
  - Where: `ui/googlePhotos.ts:18` adds them to `new Date()` after up to 15 minutes of polling (`photos.ts:14`), even if the owner has left Today. Across 4 am, they land on the next day.
  - Fix: take the day when the tap happens.
- **M20. A URL containing `)` breaks its Markdown link.**
  - Where: `domain/markdown.ts:14` puts `safeUrl` output into `(...)` unescaped.
  - What goes wrong: a Wikipedia URL ending `_(film)` breaks the link.
  - Fix: use `<…>` around the URL, or percent-encode `(`, `)` and spaces.
- **M21. The postcard can say "60 m".**
  - Where: `screens/Postcard.tsx:9`.
  - What goes wrong: `Math.round(m % 60)` gives "7 h 60 m" for 479.6 minutes.
  - Fix: round `m` first.
- **M22. The zip has no ZIP64.**
  - Where: `domain/zip.ts:12`, `:20`.
  - What goes wrong: 16-bit entry counts and 32-bit offsets mean an export over 65,535 files or 4 GB writes a corrupt zip without saying so.
  - Fix: refuse with a plain message past the limits, or write ZIP64 records.
- **M23. Tests don't guard the new risk points.**
  - `tests/google.test.ts` never calls `handleAuthReturn` or `signIn`, so I1 would pass.
  - `tests/gphotos.test.ts` has no blocked-popup case (I4).
  - `tests/drive.test.ts` has no error cases (I2 and I3) and doesn't check the multipart body beyond `parents`.
  - `tests/lastfm.test.tsx:33` tests the switch only before the call, not mid-flight (I5).
  - `tests/lock.test.tsx:42-48` has no `link` entry (C2).
  - No test checks that the service worker is registered (C1).
- **M24. The Calendar's day label is untrue for some days.**
  - Where: `Calendar.tsx:49`.
  - What goes wrong: it says "lines kept, no feelings named" for days that hold only a Timeline visit or only a photo.
  - Fix: say what was kept ("a place visit", "photos") rather than "lines".

---

## Declined to judge

These are things I could not settle as bug or intent from the code alone.

1. **Timeline visits count as kept days everywhere.** After an import, thousands of days since 2022 gain a `place` entry, and those days flow into every looking-back count:
   - the Almanac masthead "N days kept" (`Almanac.tsx:78`, `:82`);
   - Report "days kept" (`almanac.ts:27`);
   - the Random day pool (`Almanac.tsx:102`);
   - Calendar cells and "N days kept" (`Calendar.tsx:94`, `:66`);
   - On this day, which picks the earliest entry of the date, so a 9 am visit beats the owner's evening line (`almanac.ts:72`, `Today.tsx:93`).

   The spec says visits are "matched to days", but not whether they count as days kept. Recommendation: exclude `source: 'timeline'` from "kept" counts and from On this day and Random, or rank owner-written entries first.
2. **Popup `closed` detection under Cross-Origin-Opener-Policy.** `google.ts:47` and `photos.ts:19` treat `w.closed` as "the owner closed it". If Google's sign-in or picker page severs the opener, Chrome reports `closed === true` straight away, and both flows would give up within a second. This needs one check on the phone; if it happens, rely on the channel message and the session poll only.
3. **The shelf database could be created by Logbook first.** `sources/shelf.ts:31-35` creates `shelf` v1 with store `postcards` (`keyPath: 'id'`). If Logbook runs before Health, Health's own upgrade handler never runs. That is fine only if Health's schema is exactly this, with no indexes. Health's repo was not available to verify.
4. **"Taken today" suggestions.** The spec says "Google Photos suggestions … show ‘taken today’ suggestions". The picker lets the owner choose any photo, and all of them land on today. Logbook could read `createTime` and file each photo on its own day; that is a product call.
5. **Drive multipart size.** Google documents multipart for files of 5 MB or less. I could not confirm from the code whether larger multipart bodies are refused outright. I2 stands either way, because of the 60-second abort.
6. **People as "words" (backlog #2).** I ruled this Important (I10) because standing rule 3 lists "private lines' people". If the owner meant only the text, I10 drops to Minor.
