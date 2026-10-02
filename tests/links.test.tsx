import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyStarter, parseStarter } from '../src/db/starter';
import { openDb, type LogbookDb } from '../src/db/db';
import { getSettings } from '../src/db/actions';
import { sourcesOf } from '../src/db/stamps';
import { SettingsView } from '../src/screens/Settings';
import { DEFAULT_SETTINGS } from '../src/db/types';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('ln-' + n++); await db.open(); });
const noop = () => {};
const props = { message: '', onVoice: noop, onDayStyle: noop, onTheme: noop, onMotion: noop, onExport: noop, onBackup: noop, onRestore: noop, onStarter: noop };
describe('linked sources', () => {
  it('the starter file carries the Last.fm key, usernames and the Google client ID into settings', async () => {
    await applyStarter(db, parseStarter(JSON.stringify({ format: 'logbook-starter', version: 1, people: [], homes: [], lastfm: ['old', 'new'], lastfmKey: 'k', googleClientId: 'abc.apps.googleusercontent.com' })));
    expect((await getSettings(db)).links).toEqual({ lastfm: ['old', 'new'], lastfmKey: 'k', googleClientId: 'abc.apps.googleusercontent.com' });
  });
  it('a starter file with odd link values is refused', () => expect(() => parseStarter(JSON.stringify({ format: 'logbook-starter', version: 1, lastfm: 'old' }))).toThrow('Nothing was changed.'));
  it('new sources are on by default', () => expect(sourcesOf(DEFAULT_SETTINGS)).toEqual({ weather: true, places: true, songs: true, drive: true, photos: true }));
  it('Settings says what each linked source needs', () => {
    const none = renderToStaticMarkup(<SettingsView {...props} settings={DEFAULT_SETTINGS} />);
    expect(none).toContain('Linked sources'); expect(none).toContain('Not set up: needs a Last.fm key and username in your starter file.');
    expect(none).toContain('Not set up: needs a Google client ID in your starter file.'); expect(none).toContain('Health postcards');
    const set = renderToStaticMarkup(<SettingsView {...props} settings={{ ...DEFAULT_SETTINGS, links: { lastfm: ['a'], lastfmKey: 'k', googleClientId: 'x' }, sources: { weather: true, places: true, songs: false, drive: true, photos: true } }} />);
    expect(set).toMatch(/role="switch" aria-checked="false" aria-label="Songs"/); expect(set).toContain('Set up for a.');
  });
  it('Settings offers the Timeline import, and shows what a file holds before anything is kept', () => {
    const idle = renderToStaticMarkup(<SettingsView {...props} settings={DEFAULT_SETTINGS} />);
    expect(idle).toContain('Google Maps Timeline'); expect(idle).toContain('Choose file');
    const seen = renderToStaticMarkup(<SettingsView {...props} settings={DEFAULT_SETTINGS} timeline={{ summary: '3 visits on 2 days at 2 places, 1 May 2024 to 2 May 2024.', count: 3 }} />);
    expect(seen).toContain('3 visits on 2 days at 2 places'); expect(seen).toContain('Add them'); expect(seen).toContain('Not now');
    const none = renderToStaticMarkup(<SettingsView {...props} settings={DEFAULT_SETTINGS} timeline={{ summary: 'No visits from 2022 on were found in this file.', count: 0 }} />);
    expect(none).not.toContain('Add them');
  });
});
