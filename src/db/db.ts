import Dexie, { type Table } from 'dexie';
import type { DayRow, Entry, Moment, OwnWord, Person, Settings } from './types';

/* Version 1 holds every table the spec names, so later stages add data, not migrations. */
export class LogbookDb extends Dexie {
  entries!: Table<Entry, number>;
  moments!: Table<Moment, number>;
  days!: Table<DayRow, string>;
  people!: Table<Person, string>;
  words!: Table<OwnWord, string>;
  settings!: Table<Settings, string>;
  photos!: Table<{ id?: number; day: string; blob: Blob; thumb: Blob; takenAt?: number }, number>;
  places!: Table<{ id?: number; name: string; lat: number; lon: number; first: boolean; visits: number }, number>;
  spans!: Table<{ id?: number; name: string; from: string; to: string; family: string }, number>;
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
  }
}
export const openDb = (name = 'logbook') => new LogbookDb(name);
export const db = openDb();
