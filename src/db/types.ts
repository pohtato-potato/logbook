import type { Family } from '../vocab/vocab';
/* Kept on every synced record by the hooks in syncMeta.ts. */
export type Synced = { uid?: string; updatedAt?: number };
export type Marks = { first?: boolean; gift?: boolean; priv?: boolean; quiet?: boolean };
export type EntryKind = 'line' | 'media' | 'quote' | 'place' | 'person' | 'keep' | 'voice' | 'span' | 'past' | 'link';
export type MediaKind = 'Film' | 'Series' | 'Book' | 'Game' | 'Album' | 'Other';
export type How = 'In person' | 'Call' | 'Messages';
/* What each kind keeps beyond its words. A line has none. */
export type EntryData =
  | { kind: 'media'; media: MediaKind; title: string; rating: number; current: boolean }
  | { kind: 'quote'; who: string; where?: string } // who: a person's initial, 'Overheard' or 'A book or film'
  | { kind: 'place'; placeId: number; first: boolean }
  | { kind: 'person'; who: string[]; how: How } // initials
  | { kind: 'keep'; photoId?: number }
  | { kind: 'voice'; audio: Blob; seconds: number; type: string }
  | { kind: 'span'; spanId: number }
  | { kind: 'past' }
  | { kind: 'link'; url: string; title?: string }; // url is '' when it wasn't a web address
/* text holds the entry's own words: the line, the quote, a note on a film, the keepsake's name. */
export type Entry = { id?: number; day: string; at: number; tz: string; kind: EntryKind; text: string; marks: Marks; tags: string[]; people: string[]; writtenAt: number; data?: EntryData; source?: 'timeline' } & Synced;
export type Photo = { id?: number; day: string; blob: Blob; thumb: Blob; takenAt?: number; addedAt: number } & Synced;
export type Place = { id?: number; name: string; lat?: number; lon?: number; first: boolean; visits: number } & Synced;
export type Span = { id?: number; name: string; from: string; to: string; family: Family } & Synced;
export type Moment = { id?: number; day: string; at: number; word: string; family: Family; second?: Family; about?: string; strength: number; entryId?: number } & Synced;
/* A day's automatic stamps: where the owner said they were, and cached weather and air (final once the day is well over). */
export type DayStamps = { where?: { lat: number; lon: number }; weather?: { code: number; max: number; min: number; rain: number; final: boolean; at: number; lat?: number; lon?: number }; air?: { aqi?: number; category?: string; lead?: string; none?: boolean; final: boolean; at: number; lat?: number; lon?: number }; pending?: boolean; tried?: { at: number; lat: number; lon: number }; song?: SongStamp };
export type SongStamp = { artist: string; track: string; plays: number; final: boolean; at: number };
/* A finished week's most-played track, Monday to Sunday (plays 0 when nothing was played). */
export type WeekSong = { week: string; artist: string; track: string; plays: number } & Synced;
export type DayRow = { day: string; overall?: { word: string; family: Family; strength: number; set: boolean }; grateful?: string; potd?: number; stamps?: DayStamps; headline?: string; fieldAt?: Partial<Record<'overall' | 'grateful' | 'headline' | 'potd', number>> } & Synced;
export type Person = { id: string; initial: string; name: string; thread: number; birthday?: string } & Synced;
export type OwnWord = { word: string; family: Family; created: number } & Synced;
export type Sources = { weather: boolean; places: boolean; songs?: boolean; drive?: boolean; photos?: boolean; sync?: boolean };
/* This device's side of sync: its own id, where it got to in each other device's file, and when it last synced. */
export type SyncState = { device: string; cursors: Record<string, string>; labels?: Record<string, string>; last?: number; with?: string[]; pushed?: string };
/* What the private starter file brings for the linked sources. Never in the repo. */
export type Links = { lastfm: string[]; lastfmKey?: string; googleClientId?: string };
export type Settings = { id: 'main'; voice: number; dayStyle: 'bloom' | 'score'; theme: 'dark' | 'light'; motion: 'still' | 'gentle' | 'lively'; homes: { name: string; lat: number; lon: number; from: string; to?: string }[]; starterLoaded: boolean; lastExport?: number; lastDrive?: number; sync?: SyncState; sources?: Sources; links?: Links; lock?: { credentialId: string; createdAt: number; userId?: string } };
export const DEFAULT_SETTINGS: Settings = { id: 'main', voice: 0, dayStyle: 'bloom', theme: 'dark', motion: 'gentle', homes: [], starterLoaded: false };
