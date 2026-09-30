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
    npm run icons    # re-render the app icons

Stage 1 (this build): Today, the writing box with # @ :, marks, Keep and Undo, the feeling picker and card,
the day overall, the day page (Bloom or Score), the month calendar, settings, Markdown export, backup and restore,
and the first run. Stages 2 and 3 are in `docs/superpowers/specs/`. Before a release, run the checks in `scripts/probe.md`.

Design: `PRODUCT.md`, `docs/superpowers/specs/`, `design/logbook-pinboard-8.html`.
