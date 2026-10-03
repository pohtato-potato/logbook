# Logbook sync between devices — plan

> Executed inline. Owner's answers (2026-10-03): write on both devices; automatic or button, either; photos sync too; full sync now. One review at the end.

**Goal:** the phone and the laptop (or any device) hold the same Logbook, through the owner's own Google Drive. No server, no new account.

**Design**
- Each record of a synced table carries `uid` (stable across devices) and `updatedAt`. Auto-numbered tables (entries, moments, places, spans, photos) get a deterministic uid from what they were created with, so records already copied between devices by backup/restore match instead of doubling. Natural-key tables (days, people, words, tags, postcards, songs) use their key.
- Dexie hooks stamp `uid`/`updatedAt` on every create and update, and record a tombstone on every delete, so no action needs changing. Writes coming from another device carry a marker that keeps their own times.
- Days merge by field group: the owner's fields (overall, grateful, headline, photo of the day) by `userAt`; stamps unioned (weather is re-fetchable).
- Each device writes `Logbook/sync/device-<id>.json`: every synced record (references as uids, blobs as file names) plus tombstones. Photos, thumbnails and voice notes go up once as `photo-<uid>`, `thumb-<uid>`, `audio-<uid>`.
- A sync: list the sync folder → read other devices' snapshots changed since last time → merge (newest edit per record wins; a delete wins over an older edit) fetching missing blobs → upload missing blobs → upload own snapshot.
- Settings are per device and never synced (the lock is tied to the device).
- Triggers: "Sync now" in Settings (signs in); automatic while a Google token is valid (on open, on return, every 5 minutes, 30 s after a change). Today says when this device hasn't synced for a day. Switch: Linked sources → "Sync between devices".

**Tasks**
1. Sync metadata: uid, updatedAt, userAt, tombstones; Dexie v4 migration; hooks. Tests.
2. Snapshot export and merge between two databases: inserts, edits, deletes, references, days, blobs. Tests.
3. Drive I/O: folder, listing, pull, push, blobs, cursors; switch checked mid-flight. Tests with fake Drive.
4. UI and automatic sync: Settings row, button, status; Today reminder; auto triggers. Render tests, browser check.
5. Whole check (suite also under TZ=UTC, build), one review, fixes.
