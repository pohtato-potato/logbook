import Dexie, { type Table } from 'dexie';
import type { DayRow, Entry, Moment, OwnWord, Person, Photo, Place, Settings, Span } from './types';

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
  }
}
export const openDb = (name = 'logbook') => new LogbookDb(name);
export const db = openDb();
