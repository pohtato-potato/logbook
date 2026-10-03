# Sync review (branch `sync` vs `main`)

Read-only review of `git diff main...sync` (commits 6cc6fff..7c370db). No source file was changed. Findings marked **[probed]** were reproduced with throwaway Vitest probes run against the real `src/` code and fake-indexeddb, from a scratch folder outside the repo. The existing suite passes (`npx vitest run tests/sync-` gives 20/20).

The design is sound: whole-state snapshots per device, tombstones, uid translation, and blobs uploaded before the snapshot that points at them. The upgrade does not leak `__fromSync` into stored rows; I checked this with a probe. The serious problems are in four places: restore, the day merge, how uids are derived, and clocks. Each one silently loses or doubles the owner's writing **on both devices**.

---

## Critical

### C1. Restoring a backup on one device deletes newer entries and reverts edits on every other device [probed]
- `src/db/backup.ts:38`: `await db.table(t).clear(); ... bulkPut(rows)`.
- `src/db/syncMeta.ts:72-77`: the `deleting` hook fires for every row that `clear()` removes (Dexie's hooks middleware runs it per row on a ranged delete) and writes a tombstone with `at = now()`.
- `src/db/syncMeta.ts:57-58`: every restored row is a non-REMOTE create, so it gets `updatedAt = now()`, newer than anything on the other devices.
- **Scenario (probed):** the phone writes "june line". The laptop syncs and makes a backup. On the phone, the owner writes "july line" and edits the June text. The laptop syncs both. Then the owner restores the June backup on the laptop, for example to recover something, or because a restore is how a new device gets set up. At the laptop's next sync the phone ends with just `['june line']`: "july line" is **removed** (the tombstone is newer) and the August edit is **reverted** (the restored row is newer). Merge result on the phone: `{changed: 1, removed: 1}`.
- **Fix:** run restore as a sync-quiet operation. Suppress tombstones for `clear()` (for example, a module flag the deleting hook checks), write restored rows with `REMOTE` so they keep their own `updatedAt`, and reset `sync.cursors` so the next sync pulls everything back in.

### C2. A restore copies the other device's sync identity, so the two devices stop seeing each other while both report "Synced" [probed]
- `settings` is in the backup's `TABLES` (`src/db/backup.ts`), and restore clears and replaces it, including `settings.sync.device` and its cursors.
- `src/sources/sync.ts:28`: `if (... name === mine) continue;` and `:40`: each device PATCHes `device-<id>.json`.
- **Scenario (probed):** the laptop restores the phone's backup, which is the very path the plan relies on ("records already copied between devices by backup/restore match"). The laptop's `settings.sync` is now `{device: "dA"}`, the phone's id. From then on each device skips the other's file as "mine" and overwrites it with its own snapshot. Nothing merges in either direction. Settings shows "Synced. This is the first device…" or the old "with Phone" label, and the Today reminder never fires because `last` keeps moving. If one device is lost, everything only it had is gone.
- **Fix:** in `restoreBackup`, keep the local `settings.sync` (and `lock`) and never take them from the file. Or strip `sync` in `makeBackup*`, and make a new device id whenever a restored id matches a file this device didn't write.

### C3. The day merge is all-or-nothing for the owner's fields: a newer edit to one field wipes the other device's other fields [probed]
- `src/sync/snapshot.ts:89-96`: `userR` compares a single `userAt`. If the remote one is newer, **every** owner field is copied from the remote, including `if (r[f] === undefined) delete out[f]`, and `potd` is dropped when the remote has none.
- `src/db/syncMeta.ts:59,68`: any one of overall, grateful, headline or potd moves the shared `userAt`.
- **Scenario (probed):** at 9 am on the phone the owner writes Grateful for "my mother". At 10 am on the laptop, before the two have synced, they set the day overall. After a sync both devices hold `{overall: calm}` and **"my mother" is gone everywhere**. Writing on both devices on the same day is the owner's normal pattern. The same happens when one device picks the photo of the day and the other writes the headline.
- **Fix:** give each field its own time (for example `fieldAt: {overall, grateful, headline, potd}`, stamped in the updating and creating hooks from the changed keys) and merge each field on its own time.

---

## Important

### I1. Clock skew: an edit made on the slower-clocked device after a remote edit is silently lost on both devices [probed]
- `src/db/syncMeta.ts:46-47,67`: `now()` is `max(Date.now(), clock+1)`, where `clock` is this device's own counter. It never passes a stored `updatedAt` that came from another device.
- **Scenario (probed):** the laptop's clock runs 10 minutes fast (phones and laptops often drift, and manual time zone changes make it worse). The laptop edits an entry, and the phone receives it with a future `updatedAt`. Five minutes later the owner corrects the entry on the phone. That edit is stamped *lower* than the stored one, so the next merge puts the laptop's version back on the phone: both devices show "laptop edit". Deletes behave the same way, through the tombstone `at`.
- **Fix:** in the updating hook (which receives the old object as its third argument) stamp `max(now(), old.updatedAt + 1)`. In merge, advance `clock` past every `updatedAt` it accepts.

### I2. Undoing the first write of a day deletes the other device's whole day row (grateful, headline, photo of the day, stamps) [probed]
- Undo calls `db.days.delete(day)` when there was no row before: `src/db/actions.ts:49` (overall), `:121` (photo of the day), `:151` (headline), `src/db/stamps.ts:55` (where today). This leaves a `days:<day>` tombstone.
- `src/sync/snapshot.ts` (the tombstone loop after line 75) deletes the other device's row whenever its `updatedAt` is older.
- **Scenario (probed):** the phone has the day with grateful and headline. The laptop, not yet synced, sets the overall and taps Undo. After a sync the phone's row is `undefined`: the grateful text and headline are gone.
- **Fix:** never tombstone `days`. Undo should write the row back without the field rather than delete it, or a day tombstone should only clear the fields it is newer than.

### I3. uids made at upgrade from editable fields double every record that was copied by backup and then edited [probed]
- `src/db/syncMeta.ts:26-30` builds the seed from the current `text`, `at` and `word` for entries and moments, and from the current name for places and spans. `src/db/db.ts:41` computes it from the **current** values.
- **Scenario (probed):** the owner restored the phone's backup onto the laptop in June, then edited the text of an entry on one device. Removing a feeling (`removeFeelingFromEntry`) also rewrites both the text and the moment's word. At the first sync the two copies get different uids, and **both versions appear on both devices** (`['v1 edited', 'v1']`). The same happens to moments whose word changed, renamed places, and spans.
- **Fix:** seed only from fields that never change after creation, for example entries `day|writtenAt|kind` and moments `day|at|entryWrittenAt`. Before releasing, test the upgrade with two diverged copies.

### I4. Places with the same name share one uid: they merge into one place, and the original device's coordinates get overwritten [probed]
- `src/db/syncMeta.ts:29`: the places uid is the lower-cased name. Timeline import creates several places with the same name, for example two "Home"s or "Work"s more than 100 m apart after a move, or chain names like "Starbucks" (`src/sources/timeline.ts:46` `nameFor`, and `importTimeline` adds them without a name check).
- **Scenario (probed):** the phone has Home (28.5, 77.2) and Home (19.0, 72.8). The laptop ends up with one Home holding both visits. Back on the phone, Delhi's Home is overwritten with Mumbai's coordinates (`[[1,19,1],[2,19,1]]`). The map and the visit history are wrong on both devices. Deleting either place would also tombstone both.
- **Fix:** add rounded coordinates to the seed, or give places a random uid at creation and keep "same name means same place" only inside `addPlace` and `keepPlace`.

### I5. A missing or deleted link makes a record wait forever: the cursor never moves, the whole snapshot is re-merged every sync, and some edits never arrive [probed]
- `src/sync/snapshot.ts:62-63`: a place or span entry whose `placeUid`/`spanUid` is missing or already deleted sets `ok = false`. In `src/sources/sync.ts:35`, `if (!r.waiting)` means the cursor for that device never advances again.
- **Scenario (probed):** the phone removes a span entry, which also deletes its span. Meanwhile the laptop edits the entry's note. From then on every phone sync reports `waiting: 1`. The laptop's edit never reaches the phone, the laptop keeps an entry pointing at a deleted span, and the phone re-downloads and re-merges the laptop's entire file on every sync. Toasts keep saying "1 thing is still on its way". A place entry whose place was already gone on the source device (`placeUid` undefined) has the same effect.
- **Fix:** treat a missing link as resolved when the target is tombstoned or the source sent no uid, and store the record without the link. Count only missing blobs as "waiting".

### I6. The photo of the day is dropped, not held back, when its photo hasn't arrived, and the next edit then removes it on the other device too [probed]
- `src/sync/snapshot.ts:69` (new day) and `:94-95` (`mergeDay`): an unresolved `potdUid` is deleted, but the day still takes the remote `userAt` and counts as `changed`.
- **Scenario (probed):** the photo's blob is still waiting (for example a failed download or a lagging listing). The laptop's day takes the newer `userAt` without the photo of the day, and with equal `userAt` it never picks it up later. If the owner then edits that day on the laptop, `potd` is deleted on the phone as well.
- **Fix:** when `potdUid` can't be resolved, count the day as waiting and leave it unmerged (or keep `potdUid` on the row and resolve it after the photos arrive).

### I7. Private entries can reach Drive without an unlock, against the Task 4 ruling
- `src/screens/Today.tsx:104`: Today's "Sync now" calls `runSync(true)` without the `opened()` unlock that `Settings.tsx:118` uses.
- `src/ui/syncNow.ts` `runSync(false)` never looks at the lock. Automatic sync runs whenever any Drive-scoped token exists, including after the app has locked again. Google Photos sign-in uses `include_granted_scopes: 'true'` (`src/sources/google.ts:9`), so a token from a sign-in that never involved an unlock is likely to carry `drive.file` once it has been granted.
- **Scenario:** the app is locked, the owner taps the Today reminder, signs in, and every private entry's text is uploaded in plain JSON. The Drive backup rule ("private text leaves only after unlock") is not met.
- **Fix:** use the same `opened()` check in Today's handler, and have `runSync(false)` skip while `privacy.locked` (pass the state in, or keep a flag that the session has been unlocked).

### I8. Every sync re-uploads the full snapshot, so each other device re-downloads and re-merges the whole journal every five minutes [probed]
- `src/sources/sync.ts:38-40` uploads `mine` unconditionally. The new `modifiedTime` then defeats the other device's cursor at `:30`.
- **Probe:** an idle round with no changes on either device logs `GET …/f6?alt`, `UPLOAD device-…json`, `GET …/f4?alt`, `UPLOAD device-…json`. With years of entries, that means several MB in each direction and tens of thousands of IndexedDB reads per device every 5 minutes and on every return to the app, all on mobile data. The test "a sync with nothing new reads nothing new" passes only because the phone never syncs in between.
- **Fix:** hash the snapshot without `at`, keep the hash in `SyncState`, and skip the upload when it hasn't changed.

### I9. Drive folder and file races can split the devices into different sync folders, while each reports success
- `src/sources/drive.ts:13,15-16`: `folder()` searches first and creates if nothing is found, and `find` takes `files[0]` in no particular order. `src/sources/sync.ts:40` creates a new device file whenever the listing doesn't show its own (`known = null`). `src/sources/drive.ts:24`: `listFolder` keeps one entry per name, whichever comes last.
- **Scenario:** the owner taps Sync now on the phone, then within seconds on the laptop. Drive's search is eventually consistent and can miss a folder created moments earlier, so two `sync` folders (or two `Logbook` folders) appear. Each device can then keep picking a different one. Neither ever sees the other, and each says "This is the first device". Duplicate `device-<id>.json` files cause a similar split: one device PATCHes one copy while the others read the stale one.
- **Fix:** query every match ordered by `createdTime` and always use the oldest. After creating a folder, list again and adopt the oldest. For device files, pick the newest `modifiedTime` and trash the extras.

---

## Minor

- **M1. Tombstone writes race their own clean-up [probed].** `syncMeta.ts:63,77`: the put and delete for a tombstone run as separate after-commit writes that nothing awaits. After a restore, a tombstone stayed behind for a record that is still alive. It is harmless today only because that record's `updatedAt` is newer. Fix: write tombstones inside the same transaction, for example through a DBCore middleware or by adding `tombstones` to the transaction.
- **M2. Ties never converge.** `snapshot.ts:41` `newer` uses a strict `>`. After the upgrade, places, spans, people, words, tags, songs and days all have `updatedAt = 0`, and entries have `writtenAt` (`syncMeta.ts` `firstTime`). So differences between copies made before sync (a place's coordinates, a person's thread, a day's grateful) are never reconciled. Fix: break ties by device id or a content hash.
- **M3. Merge runs outside a transaction.** `snapshot.ts:55-72`: an edit the owner makes between the `local()` read and the `put` is overwritten. The window is small. Fix: a short transaction per record that re-checks `updatedAt`.
- **M4. The stamps union can't remove keys.** `snapshot.ts:98`: an Undo of "where I am" or a cleared `pending`/`tried` comes back from the other device.
- **M5. "Syncing…" can stick.** `syncNow.ts` returns the in-flight automatic run, and that run returns `null` when there is no token. `Settings.tsx:118` only sets a message when `r` is truthy.
- **M6. Automatic sync is silent and short-lived.** `useAutoSync.ts:9` swallows every error. Tokens last an hour, so in practice the owner taps on each device every session, while the hint (`Settings.tsx:74`) promises "it syncs by itself".
- **M7. Blob files are named by uid and uploaded only once,** so a changed blob is never re-uploaded. A blob with no type goes up as `application/zip` (`drive.ts:33`), which can break voice playback on Safari.
- **M8. The photo uid is `day|addedAt`** (`syncMeta.ts`), so two photos stored in the same millisecond collapse into one file. This is unlikely because resizing runs between them.
- **M9. Starter file reload.** `starter.ts:35` re-puts people with `thread: p.thread ?? i`, and loading the starter on the second device (which the hint tells the owner to do) resets thread choices made on the first device everywhere.
- **M10. Tag tombstones.** `actions.ts:35`: an Undo that removes an unused tag tombstones it, and the other device drops its tag row even though its own entries use that tag.
- **M11. Concurrency and size.** The `running` guard works per tab, so two windows sync at once. Tombstones are never pruned. Each request has a 60 s limit (`http.ts`), which can fail a large snapshot download on slow mobile data every time.
- **M12. Tests don't test what they claim.**
  - "a delete travels, and an edit made after the delete survives it" (`tests/sync-merge.test.ts`) makes no edit after the delete.
  - "places travel with their visits" never checks `visits`.
  - The "nothing new" Drive test misses the re-upload loop (I8).
  - `fakeDrive` ignores `pageToken`/`pageSize`, so paging is untested, and it crashes on `bytes */0`.
  - Nothing tests restore, a day merge across two different fields, clock skew, duplicate folders, the lock, or automatic sync.

---

## Declined to judge

- Whether private text should be encrypted inside the Drive sync file. It is plain JSON, just as the Drive backup zip is plain, so it is consistent with the existing rule once I7 is fixed.
- The ruling that tokens last an hour with no silent sign-in. That is a product trade-off, noted only under M6.
- A possible weather ping-pong when the two devices have different `homes` (settings are per device). I couldn't reproduce it, and it needs a real Today render loop.
- Real Drive search-consistency timings for I9. That is reasoned from Drive's documented eventual consistency, not observed.
- Dexie hook behaviour in real browsers. The `clear()` hook firing and the upgrade not leaking were verified under fake-indexeddb and Dexie 4.4 only. The plan's browser check covered the upgrade.
