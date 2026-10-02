import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const ALLOWED = new Set(['api.open-meteo.com', 'archive-api.open-meteo.com', 'air-quality-api.open-meteo.com', 'overpass-api.de',
  'ws.audioscrobbler.com', 'www.googleapis.com', 'photospicker.googleapis.com', 'lh3.googleusercontent.com',
  'accounts.google.com']); // accounts.google.com is only ever a sign-in page the owner is sent to, never fetched
const files = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; });
describe('Logbook only talks to the named sources', () => {
  it('every https host in src is on the list, and only sources/http.ts calls fetch', () => {
    for (const f of files('src').filter(f => /\.(ts|tsx)$/.test(f))) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/https?:\/\/([a-z0-9.-]+)/g)) expect(ALLOWED.has(m[1]), `${f}: ${m[1]}`).toBe(true);
      if (!f.split(sep).join('/').endsWith('sources/http.ts')) expect(/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(s), f).toBe(false);
    }
  });
});
