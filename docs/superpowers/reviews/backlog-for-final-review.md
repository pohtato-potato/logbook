> **Resolved 2026-10-02** in the final review fix pass (see final-review.md): every item below is fixed.

# Findings waiting for the final comprehensive review

The owner asked (2026-10-02) for one comprehensive review after the whole build, not one per stage.
These are open findings from the Stage 3a review (opus, 2026-10-02), to be fixed or ruled on then.

## Private entries while locked (the "no words anywhere" rule)
1. CRITICAL: `maskPrivate` passes `link` data through, so a private link's title shows while locked: Report Notable, the Wrapped Firsts card (and its saved PNG), Firsts/Gifts shelves. Fix: mask `link` to `{ kind: 'link', url: '' }`; add a test. (`src/domain/looking.ts`)
2. People from private lines show while locked: Report "R turns up most on…", headline suggestion "…with R", Wrapped "Together" card, Desk "Together today" (reads raw entries). Rule on whether people count as words; filter `!(locked && e.marks.priv)`.
3. Echoes point at a private feeling while locked (`DayPage` passes raw earlier moments to `echoFor`).
4. While locked, "a private feeling" can be counted as the top word (Wrapped Words card, Report Notable). Filter `PRIVATE_FEELING` before `wordCounts`.

## Wording
5. Wrapped "mostly" line can be untrue ("most of them on #walk days" when one of ten days had #walk; "most of them" with 1 moment).
13. Report "1 day kept / 0 moments" when only lines kept; "turns up most on Mondays" when weekdays tie at 1; Random day's form can come from a quiet line's moment; "Another day" can repeat the same day.

## Sharing in
6. A share with no title but text (YouTube style) keeps "Link: youtu.be" and loses the text. Use `title: shared.title || shared.text.slice(0, 200)`.
7. "Your line" is shown but dropped for "A quote" and "Watched".
14. URL found inside text keeps trailing `)` or `.`; unsafe addresses are stored as '' rather than as text.

## Laptop
8. Desk calendar day squares are ~25–28 px wide at 1024 px (44 px rule; mouse use).
9. Keys act while a dialog (EntryMenu/FeelingCard) is open; `/` and `N` can leave a half-filled form. Ignore keys when `[aria-modal="true"]` is open; ignore `e.repeat`.
11. Canvas and desk CSS ask for `'Archivo'`; the loaded family is `"Archivo Variable"`.

## Other
10. `cardPng` has no fallback without OffscreenCanvas (older Safari).
12. Film-form prefill reads/removes sessionStorage during render; can be lost under StrictMode in development.
15. `thenAndNow` is unused (Almanac rebuilds it inline).

Earlier deferred minors from Stages 2a–2c are listed in each stage's final message in the session; the final review should sweep the whole app anyway.
