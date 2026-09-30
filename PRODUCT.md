# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Not decided yet. Health's setup is the likely starting point; to be confirmed when the build is planned.

## Users

One person: the owner, writing in English. Nobody else uses it.

- On the phone (Samsung S23, installed from Chrome as an app): quick taps through the day and a line at night.
- On the laptop (the Zen browser): reading, browsing and longer entries at home. The laptop is a full second home, not a lesser one.

## Product Purpose

Logbook is a low-effort archive of the owner's life.

- Every entry takes one tap or one line.
- Missed days never feel like failure.
- Its value builds over years through looking back: on this day, the calendar and the year, weekly and monthly headlines, Wrapped-style recaps, and the Almanac report.

Success means the owner is still using it most days years from now, and any old day can be found and read, even without the app.

## Positioning

- **Feelings are first-class.** The vocabulary has 242 feeling words in nine families, with nuances, strengths, blends, words from other languages, everyday slang and the owner's own words. Feelings are drawn as inner weather, and "right now" is kept separate from "the day overall".
- **The archive outlives the app.** Everything exports as plain Markdown files and photo folders.
- **It is the hub of a family of small apps.** Logbook will work with a suite of personal web apps being made now: Health (built), and later Media, Places, Everyday Book and possibly People. The apps swap small daily "postcards" through a shared shelf, and each kind of data has exactly one owning app.

## Operating Context

- **Capture:**
  - Today's line, with # for tags, @ for people and : for feelings.
  - Photos, with a photo of the day.
  - Feelings, right now or for the whole day.
  - Films, books and shows, rated on a 1–7 scale, with a "Currently" pin.
  - Quotes and overheard lines.
  - Places and firsts; people seen, called or messaged.
  - Keepsakes, voice notes and spans of days.
  - Big moments from before, marked "written later".
  - Things shared in from other apps.
- **Automatic stamps on each day:** weather, air quality on the Indian scale, sun times, steps and sleep from Health, the song playing, and more.
- **Rituals:**
  - A line at night.
  - The week in a line on Sundays.
  - A monthly backup to Google Drive.
  - A day ends at 4 am; weeks start on Monday.
- **Linked sources:** Last.fm, Google Maps Timeline exports, Google Photos suggestions, and Health.

## Capabilities and Constraints

- Data stays on the phone by default, with no accounts. Backup and sync go through the owner's Google Drive.
- The code is public, so no personal data goes in it. Names, homes, birthdays and locations live only in a private starter file that is never committed.
- It shares a website with Health. It has its own database and never loads outside scripts, and its address must never change.
- No reminders, widgets or background location.
- Marks on any entry: first, gift, private and "don't bring back". Private entries sit behind a lock, and "don't bring back" keeps an entry out of looking back.
- **Terminology:** moments, the day overall, feeling families, inner weather, stamps, spans, marks, shelves, the Almanac, postcards.
- **Not decided yet:** the stack, the build order, and whether it defaults to light or dark.

## Brand Commitments

- The name is Logbook, at pohtato-potato.github.io/logbook/.
- **Voice:** the Archivist by default, with seven more voices to switch between (Friend, Gremlin, Ship's captain, Nature documentary, Noir detective, Time traveller, Conspiracy theorist) and quirky stats.
- **Personality, yes. Cute mascots or guilt, never.**

## Evidence on Hand

- **The Feelings Atlas**, the approved vocabulary: https://claude.ai/artifact/45B87pkUYyQFEcxWowDTsB
- **Six rounds of look-and-feel pinboards**, with the owner's saved reactions. The latest is Logbook Pinboard 6: https://claude.ai/artifact/4Czrr8QVkNeCYWp4ozPnBH
- **The Health app**, already built, whose patterns can be reused.
- **No real entries exist yet.** Every screen so far uses made-up example data (Friend A, Home 2). Never replace it with real names or places in the code.

## Product Principles

1. **One tap or one line.** Capture must never feel like a chore.
2. **Missed days are normal.** No streaks, reminders or achievements.
3. **Feelings stay in the owner's own words.** They are never scored, diagnosed, or charted as better or worse.
4. **Private by default and built to outlive the app.**
5. **Looking back is the reward.** Every entry should make some future look back richer.
6. **Character, but legibility first.**

## Accessibility & Inclusion

- **The owner has low vision** and uses Android's magnifier when needed. Text stays at normal app sizes (not oversized); contrast is strong (at least WCAG AA) and tap targets are big. The app respects the phone's text-size setting.
- **No handwriting, script, thin or condensed type** for anything that is read.
- **Colour never carries meaning on its own.**
