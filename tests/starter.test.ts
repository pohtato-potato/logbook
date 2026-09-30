import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { StarterError, applyStarter, parseStarter } from '../src/db/starter';
import { getSettings } from '../src/db/actions';

const example = readFileSync('tests/fixtures/starter.example.json', 'utf8');
let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('st-' + n++); await db.open(); });

describe('starter file', () => {
  it('loads people and homes, and gives each person a thread colour', async () => {
    await applyStarter(db, parseStarter(example));
    expect(await db.people.count()).toBe(2);
    expect((await db.people.get('r'))?.thread).toBe(1);
    const s = await getSettings(db);
    expect(s.homes).toHaveLength(2);
    expect(s.starterLoaded).toBe(true);
  });
  it.each([
    ['not JSON', 'nope{', 'isn’t readable'],
    ['the wrong kind of file', '{"format":"health-starter"}', 'isn’t a Logbook starter file'],
    ['a person with no initial', '{"format":"logbook-starter","version":1,"people":[{"id":"x","name":"X"}],"homes":[]}', 'person 1 has no initial'],
  ])('refuses %s with a plain message and writes nothing', async (_, text, msg) => {
    expect(() => parseStarter(text)).toThrow(StarterError);
    expect(() => parseStarter(text)).toThrow(msg);
    expect(await db.people.count()).toBe(0);
  });
});
