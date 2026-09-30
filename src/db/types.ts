import type { Family } from '../vocab/vocab';
export type Marks = { first?: boolean; gift?: boolean; priv?: boolean; quiet?: boolean };
export type Entry = { id?: number; day: string; at: number; tz: string; kind: 'line'; text: string; marks: Marks; tags: string[]; people: string[]; writtenAt: number };
export type Moment = { id?: number; day: string; at: number; word: string; family: Family; second?: Family; about?: string; strength: number; entryId?: number };
export type DayRow = { day: string; overall?: { word: string; family: Family; strength: number; set: boolean }; grateful?: string };
export type Person = { id: string; initial: string; name: string; thread: number; birthday?: string };
export type OwnWord = { word: string; family: Family; created: number };
export type Settings = { id: 'main'; voice: number; dayStyle: 'bloom' | 'score'; theme: 'dark' | 'light'; motion: 'still' | 'gentle' | 'lively'; homes: { name: string; lat: number; lon: number; from: string; to?: string }[]; starterLoaded: boolean; lastExport?: number };
export const DEFAULT_SETTINGS: Settings = { id: 'main', voice: 0, dayStyle: 'bloom', theme: 'dark', motion: 'gentle', homes: [], starterLoaded: false };
