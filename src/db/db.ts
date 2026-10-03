import Dexie, { type Table } from 'dexie';
import type { DayRow, Entry, Moment, OwnWord, Person, Photo, Place, Settings, Span, WeekSong } from './types';
import { REMOTE, SYNC_TABLES, firstTime, installSyncHooks, isAuto, uidFor, type Tombstone } from './syncMeta';

/* Version 1 holds every table the spec names, so later stages add data, not migrations. */
export class LogbookDb extends Dexie {
  entries!: Table<Entry, number>;
  moments!: Table<Moment, number>;
  days!: Table<DayRow, string>;
  people!: Table<Person, string>;
  words!: Table<OwnWord, string>;
  settings!: Table<Settings, string>;
  photos!: Table<Photo, number>;
  places!: Table<Place, number>;
  spans!: Table<Span, number>;
  postcards!: Table<{ id: string; app: string; day: string; version: number; data: unknown; receivedAt: number }, string>;
  tags!: Table<{ name: string; created: number }, string>;
  songs!: Table<WeekSong, string>;
  tombstones!: Table<Tombstone, string>;
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
    // Version 2: entries of every kind, found by kind.
    this.version(2).stores({ entries: '++id, day, at, kind, *tags, *people' });
    // Version 3: songs of the week, from Last.fm.
    this.version(3).stores({ songs: 'week' });
    // Version 4: sync between devices. Every synced record gets a uid and a time; deletes leave tombstones.
    this.version(4).stores({ entries: '++id, day, at, kind, *tags, *people, uid', moments: '++id, day, at, entryId, family, uid', places: '++id, name, uid', spans: '++id, from, to, uid', photos: '++id, day, uid', tombstones: 'id, table' })
      .upgrade(async tx => { for (const t of SYNC_TABLES) await tx.table(t).toCollection().modify((r: Record<string, unknown>) => { if (isAuto(t) && !r.uid) r.uid = uidFor(t, r); if (r.updatedAt == null) r.updatedAt = firstTime(r); r[REMOTE] = true; }); }); // REMOTE: the sync hooks keep these times
    installSyncHooks(this);
  }
}
export const openDb = (name = 'logbook') => new LogbookDb(name);
export const db = openDb();
