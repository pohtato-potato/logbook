import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { SettingsView } from '../src/screens/Settings';
import { TodayView } from '../src/screens/Today';
import { DEFAULT_SETTINGS } from '../src/db/types';
import { deviceLabel, syncDue, syncMessage } from '../src/ui/syncNow';

const noop = () => {}, props = { message: '', onVoice: noop, onDayStyle: noop, onTheme: noop, onMotion: noop, onExport: noop, onBackup: noop, onRestore: noop, onStarter: noop, onSync: noop };
const links = { lastfm: [], googleClientId: 'x' };
describe('sync on screen', () => {
  it('Settings: a switch, Sync now, and when it last synced and with what', () => {
    const none = renderToStaticMarkup(createElement(SettingsView, { ...props, settings: DEFAULT_SETTINGS }));
    expect(none).toContain('Sync between devices'); expect(none).toContain('Not set up: needs a Google client ID in your starter file.'); expect(none).not.toContain('Sync now');
    const set = renderToStaticMarkup(createElement(SettingsView, { ...props, settings: { ...DEFAULT_SETTINGS, links, sync: { device: 'd1', cursors: {}, last: new Date('2026-10-03T14:05:00').getTime(), with: ['Laptop'] } } }));
    expect(set).toMatch(/role="switch" aria-checked="true" aria-label="Sync between devices"/); expect(set).toContain('Sync now'); expect(set).toContain('Last synced 3 October, 2:05 pm, with Laptop.');
    const fresh = renderToStaticMarkup(createElement(SettingsView, { ...props, settings: { ...DEFAULT_SETTINGS, links } }));
    expect(fresh).toContain('Not synced yet.');
  });
  it('the message after a sync says what changed, plainly', () => {
    expect(syncMessage({ merged: { added: 3, changed: 1, removed: 0, waiting: 0 }, devices: ['Laptop'] })).toBe('Synced with Laptop: 3 new, 1 changed.');
    expect(syncMessage({ merged: { added: 0, changed: 0, removed: 0, waiting: 0 }, devices: [] })).toBe('Synced. This is the first device; the others will pick it up when they sync.');
    expect(syncMessage({ merged: { added: 0, changed: 0, removed: 2, waiting: 1 }, devices: ['Phone'] })).toBe('Synced with Phone: 2 removed. 1 thing is still on its way and will come next time.');
    expect(syncMessage({ merged: { added: 0, changed: 0, removed: 0, waiting: 0 }, devices: ['Phone'] })).toBe('Synced with Phone. Nothing new.');
  });
  it('a reminder on Today once a day has passed without a sync; devices name themselves', () => {
    const s = { ...DEFAULT_SETTINGS, links, sync: { device: 'd', cursors: {}, last: new Date('2026-10-01T10:00:00').getTime() } }, now = new Date('2026-10-03T10:00:00');
    expect(syncDue(s, now)).toBe(true); expect(syncDue({ ...s, sync: { ...s.sync, last: now.getTime() - 3600_000 } }, now)).toBe(false); expect(syncDue(DEFAULT_SETTINGS, now)).toBe(false);
    const t = renderToStaticMarkup(createElement(TodayView, { now, greeting: 'Hi.', entries: [], moments: [], foldedOpen: false, onToggleFold: noop, onConfirmOverall: noop, onChangeOverall: noop, onOpenFeeling: noop, onEntryMenu: noop, writer: createElement('div'), night: false, syncDue: true, onSync: noop }));
    expect(t).toContain('This device hasn’t synced with your others for a day.'); expect(t).toContain('Sync now');
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14; SM-S911B) Mobile')).toBe('Phone'); expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Laptop');
  });
});
