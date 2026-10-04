import { go } from '../router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { StorageFullError, getSettings, saveSettings } from '../db/actions';
import { DEFAULT_SETTINGS, type Settings as S } from '../db/types';
import { makeMarkdownZip } from '../db/exportMarkdown';
import { BackupError, makeBackupZip, restoreBackupFile } from '../db/backup';
import { StarterError, applyStarter, parseStarter } from '../db/starter';
import { dayKey, parseDay, timeLabel } from '../domain/day';
import { runSync, syncMessage } from '../ui/syncNow';
import { sourcesOf } from '../db/stamps';
import { createLock, lockSupport } from '../domain/lock';
import { DRIVE_SCOPE, backFromGoogle, signIn } from '../sources/google';
import { backupToDrive } from '../sources/drive';
import { authCall, authSend } from '../sources/http';
import { usePrivacy } from '../ui/Privacy';
import { failMessage, useUndo } from '../ui/Undo';
import { parseTimeline, planImport, type ImportPlan } from '../sources/timeline';
import { importTimeline } from '../db/timeline';
import { VOICES } from '../domain/voices';
import { Tabs } from '../ui/Tabs';

/* Save a file with the system picker where the browser has one, otherwise as a download. */
export async function saveFile(blob: Blob, name: string): Promise<boolean> {
  const w = window as unknown as { showSaveFilePicker?: (o: object) => Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }> };
  if (w.showSaveFilePicker) { try { const h = await w.showSaveFilePicker({ suggestedName: name }); const s = await h.createWritable(); await s.write(blob); await s.close(); return true; } catch (e) { if ((e as Error).name === 'AbortError') return false; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
const pick = <T extends string | number,>(label: string, options: [T, string][], cur: T, on: (v: T) => void) =>
  <div className="chips" role="group" aria-label={label}>{options.map(([v, l]) => <button key={String(v)} type="button" className={'chip' + (v === cur ? ' on ink' : '')} aria-pressed={v === cur} onClick={() => on(v)}>{l}</button>)}</div>;
const Row = ({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) => <div className="setrow"><div><b>{title}</b><span>{sub}</span></div>{children}</div>;
export type SettingsProps = { settings: S; message: string; onVoice(i: number): void; onDayStyle(s: S['dayStyle']): void; onTheme(t: S['theme']): void; onMotion(m: S['motion']): void; onExport(): void; onBackup(): void; onRestore(f: File): void; onStarter(f: File): void; onSource?(key: 'weather' | 'places' | 'songs' | 'drive' | 'photos' | 'sync', on: boolean): void; onSync?(): void; lockSupported?: boolean | null; onLock?(on: boolean): void; onResetLock?(): void; onDrive?(): void; timeline?: { summary: string; count: number } | null; onTimelineFile?(files: File[]): void; onTimelineKeep?(): void; onTimelineCancel?(): void };
const monthYear = (d: string) => parseDay(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const Switch = ({ on, label, onFlip }: { on: boolean; label: string; onFlip(): void }) =>
  <button type="button" role="switch" aria-checked={on} aria-label={label} className={'btn sm' + (on ? ' primary' : '')} onClick={onFlip}>{on ? 'On' : 'Off'}</button>;
export function SettingsView(p: SettingsProps) {
  const restore = useRef<HTMLInputElement>(null), starter = useRef<HTMLInputElement>(null), timeline = useRef<HTMLInputElement>(null), s = p.settings, sources = sourcesOf(s), links = s.links ?? { lastfm: [] };
  const lastfmReady = !!links.lastfmKey && links.lastfm.length > 0, googleReady = !!links.googleClientId;
  return <div className="scr"><div className="content scroll">
    <header className="thead"><h1 className="tdate sm">Settings</h1></header>
    {p.message && <p className="panel entry" role="alert">{p.message}</p>}
    <section className="panel"><h2 className="lbl">Voice</h2>{pick('Voice', VOICES.map((v, i) => [i, v.name] as [number, string]), s.voice, p.onVoice)}<p className="voice">{VOICES[s.voice % VOICES.length].greeting}</p></section>
    <section className="panel"><h2 className="lbl">Reading</h2>
      <Row title="The day page" sub="How each day is drawn">{null}</Row>{pick('The day page', [['bloom', 'Bloom'], ['score', 'Score']], s.dayStyle, p.onDayStyle)}
      <Row title="Light or dark" sub="Dark by default">{null}</Row>{pick('Light or dark', [['dark', 'Dark'], ['light', 'Light']], s.theme, p.onTheme)}
      <Row title="Motion" sub="How the feeling forms move">{null}</Row>{pick('Motion', [['still', 'Still'], ['gentle', 'Gentle'], ['lively', 'Lively']], s.motion, p.onMotion)}
      <Row title="Text size follows your phone" sub="Everything grows with your phone’s text setting." /></section>
    <section className="panel"><h2 className="lbl">Your archive</h2>
      <Row title="Export everything" sub={`Markdown files, one per day, in a zip that opens without Logbook.${s.lastExport ? ` Last on ${new Date(s.lastExport).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.` : ''}`}><button type="button" className="btn sm" onClick={p.onExport}>Export</button></Row>
      <Row title="Save a backup" sub="Everything in one file, for moving to a new phone."><button type="button" className="btn sm" onClick={p.onBackup}>Save</button></Row>
      <Row title="Restore a backup" sub="Replaces everything in Logbook with the backup."><button type="button" className="btn sm" onClick={() => restore.current?.click()}>Restore</button></Row>
      <input ref={restore} type="file" accept="application/zip,.zip,application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) p.onRestore(f); e.target.value = ''; }} />
      <Row title="People" sub="Add, edit or remove the people you mention with @."><button type="button" className="btn sm" onClick={() => go({ name: 'people' })}>Open</button></Row>
      <Row title="Your private starter file" sub={s.starterLoaded ? 'Loaded. Load it again after changing it.' : 'Names, homes and birthdays, kept only on this phone.'}><button type="button" className="btn sm" onClick={() => starter.current?.click()}>Load</button></Row>
      <input ref={starter} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) p.onStarter(f); e.target.value = ''; }} /></section>
    <section className="panel"><h2 className="lbl">Privacy</h2>
      <Row title="Lock private entries" sub={p.lockSupported === false ? 'This phone’s browser can’t use your fingerprint or PIN here.' : 'Unlock with your phone’s fingerprint or PIN.'}>
        <button type="button" role="switch" aria-checked={!!s.lock} aria-label="Lock private entries" disabled={p.lockSupported === false && !s.lock} className={'btn sm' + (s.lock ? ' primary' : '')} onClick={() => p.onLock?.(!s.lock)}>{s.lock ? 'On' : 'Off'}</button></Row>
      <p className="hint">This hides private entries inside Logbook. It isn’t encryption: your phone’s own lock protects the data.</p>
      {s.lock && p.lockSupported !== false && <button type="button" className="btn ghost wide" onClick={p.onResetLock}>Set up the lock again</button>}
      {s.lock && p.lockSupported === false && <p className="hint">This phone can’t use a fingerprint or PIN here any more. You can turn the lock off.</p>}</section>
    <section className="panel"><h2 className="lbl">Outside sources</h2>
      <Row title="Weather and air" sub="From Open-Meteo. Sends the day’s rough position (about 1 km), nothing else."><Switch on={sourcesOf(s).weather} label="Weather and air" onFlip={() => p.onSource?.('weather', !sourcesOf(s).weather)} /></Row>
      <Row title="Place names" sub="From OpenStreetMap, only when you tap Suggest. Sends where you are (about 100 m)."><Switch on={sourcesOf(s).places} label="Place names" onFlip={() => p.onSource?.('places', !sourcesOf(s).places)} /></Row>
      <p className="hint">Sunrise, sunset and the moon are worked out on your phone. Nothing else leaves it.</p></section>
    <section className="panel"><h2 className="lbl">Linked sources</h2>
      <Row title="Health postcards" sub="From the Health app on this phone, the afternoon after each day. Nothing leaves the phone." />
      <Row title="Songs" sub={lastfmReady ? `From Last.fm. Set up for ${links.lastfm.join(' and ')}.` : 'Not set up: needs a Last.fm key and username in your starter file.'}>{lastfmReady && <Switch on={sources.songs} label="Songs" onFlip={() => p.onSource?.('songs', !sources.songs)} />}</Row>
      <Row title="Drive backup" sub={googleReady ? 'A monthly copy of your export and backup, in a Logbook folder on your Google Drive.' : 'Not set up: needs a Google client ID in your starter file.'}>{googleReady && <Switch on={sources.drive} label="Drive backup" onFlip={() => p.onSource?.('drive', !sources.drive)} />}</Row>
      {googleReady && sources.drive && <><button type="button" className="btn wide" onClick={p.onDrive}>Back up to Drive now</button><p className="hint">{s.lastDrive ? `Last on ${new Date(s.lastDrive).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.` : 'Not backed up to Drive yet.'} Google asks you to sign in each time; nothing else on your Drive is visible to Logbook.</p></>}
      <Row title="Google Photos" sub={googleReady ? 'Choose today’s photos from Google Photos, only when you ask.' : 'Not set up: needs a Google client ID in your starter file.'}>{googleReady && <Switch on={sources.photos} label="Google Photos" onFlip={() => p.onSource?.('photos', !sources.photos)} />}</Row>
      <Row title="Sync between devices" sub={googleReady ? 'Keeps this device and your others the same, through a sync folder inside the Logbook folder on your Drive.' : 'Not set up: needs a Google client ID in your starter file.'}>{googleReady && <Switch on={sources.sync} label="Sync between devices" onFlip={() => p.onSource?.('sync', !sources.sync)} />}</Row>
      {googleReady && sources.sync && <><button type="button" className="btn wide" onClick={p.onSync}>Sync now</button>
        <p className="hint">{s.sync?.last ? `Last synced ${new Date(s.sync.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}, ${timeLabel(new Date(s.sync.last))}${s.sync.with?.length ? `, with ${s.sync.with.join(' and ')}` : ''}.` : 'Not synced yet.'} Load the same starter file on each device and tap Sync now on each. Once you’ve tapped it, Logbook keeps syncing by itself for about an hour while it stays open; after that, tap again.</p></>}
      <Row title="Google Maps Timeline" sub="Adds your visits since 2022 from a Timeline file you exported. The file is read on this phone only."><button type="button" className="btn sm" onClick={() => timeline.current?.click()}>Choose file</button></Row>
      <input ref={timeline} type="file" accept="application/json,.json" multiple hidden onChange={e => { const f = [...(e.target.files ?? [])]; if (f.length) p.onTimelineFile?.(f); e.target.value = ''; }} />
      {p.timeline && <div className="tlprev" role="status"><p>{p.timeline.summary}</p>
        {p.timeline.count > 0 && <><p className="hint">New places are named Home, Work or “A place near …”, and you can rename them. Visits already in Logbook are skipped.</p>
          <div className="tlbtns"><button type="button" className="btn primary" onClick={p.onTimelineKeep}>Add them</button><button type="button" className="btn ghost" onClick={p.onTimelineCancel}>Not now</button></div></>}</div>}</section>
    <section className="panel"><h2 className="lbl">Your homes</h2>
      {s.homes.length ? [...s.homes].sort((a, b) => b.from.localeCompare(a.from)).map(h => <Row key={h.name + h.from} title={h.name} sub={h.to ? `${monthYear(h.from)} to ${monthYear(h.to)}` : `Since ${monthYear(h.from)}, now`} />)
        : <p className="hint">Homes come from your private starter file. They give each day its weather and the distance from home.</p>}</section>
    <section className="panel"><h2 className="lbl">Days</h2>
      <Row title="A day ends at 4 am" sub="Late nights count as the day before." /><Row title="Weeks start on Monday" sub="Calendars begin their weeks on Monday." /></section>
  </div><Tabs current="" /></div>;
}
export function Settings() {
  const settings = useLiveQuery(() => getSettings(db), []) ?? DEFAULT_SETTINGS, [message, setMessage] = useState(() => backFromGoogle() ?? ''), busy = useRef(false), privacy = usePrivacy(), [supported, setSupported] = useState<boolean | null>(null), undo = useUndo(), [plan, setPlan] = useState<ImportPlan | null>(null);
  useEffect(() => { void lockSupport().then(setSupported); }, []);
  const opened = async () => !privacy.locked || (await privacy.unlock()); // private text leaves the app only after the owner unlocks
  const today = dayKey(new Date());
  /* A known reason (a full phone, a refused file, Google's answer) is said as it is. A long action (marked one) runs one at a time: a second tap meanwhile does nothing. */
  const act = (fn: () => Promise<unknown>, one = false) => async () => {
    if (one && busy.current) return; if (one) busy.current = true; setMessage('');
    try { await fn(); } catch (e) { setMessage(e instanceof BackupError || e instanceof StarterError ? e.message : e instanceof StorageFullError || (e as Error).name === 'PlainMessage' ? failMessage(e) : 'That didn’t work. Nothing was changed; try again.'); } finally { if (one) busy.current = false; } };
  const newLock = async () => { const made = await createLock(navigator.credentials, location.hostname, settings.lock?.userId); if (!made) return false; await saveSettings(db, { lock: { ...made, createdAt: Date.now() } }); return true; };
  return <SettingsView settings={settings} message={message} lockSupported={supported}
    onLock={on => void act(async () => {
      if (on) { if (!(await lockSupport())) { setMessage('This phone’s browser can’t use your fingerprint or PIN here.'); return; } if (await newLock()) setMessage('Private entries are locked now.'); }
      else {
        if (!(await lockSupport())) { if (!confirm('This phone can’t use a fingerprint or PIN here any more. Turn the lock off? Private entries will show as usual.')) return; }
        else if (privacy.locked && !(await privacy.unlock())) return;
        await saveSettings(db, { lock: undefined }); setMessage('The lock is off. Private entries show as usual.'); } })()}
    onDrive={() => void act(async () => {
      const id = settings.links?.googleClientId; if (!id || !(await opened())) return;
      const t = await signIn(id, [DRIVE_SCOPE]); if (!t) { setMessage('Sign-in didn’t finish, so nothing was sent to Drive.'); return; }
      setMessage('Uploading to Drive…'); const r = await backupToDrive(db, { call: authCall(t), send: authSend(t) }, new Date(), { onProgress: f => setMessage(`Uploading to Drive: ${Math.round(f * 100)}%`) }); setMessage(`Backed up to Drive: ${r.files.join(' and ')}, in your Logbook folder.`); }, true)()}
    timeline={plan && { summary: plan.summary, count: plan.visits.length }}
    onTimelineFile={files => void act(async () => {
      setPlan(null); const visits = [];
      for (const f of files) { let j: unknown; try { j = JSON.parse(await f.text()); } catch { setMessage(`${f.name} isn’t a Timeline file Logbook can read. Nothing was changed.`); return; } visits.push(...parseTimeline(j)); }
      setPlan(planImport(visits.sort((a, b) => a.at - b.at), await db.places.toArray())); })()}
    onTimelineCancel={() => setPlan(null)}
    onTimelineKeep={() => void act(async () => {
      if (!plan) return;
      const r = await importTimeline(db, plan); setPlan(null);
      undo.show(r.undo, r.added ? `Added ${r.added.toLocaleString('en-GB')} ${r.added === 1 ? 'visit' : 'visits'} from Timeline.` : 'Those visits were already in Logbook.'); }, true)()}
    onSync={() => void act(async () => { if (!(await opened())) return; setMessage('Syncing…'); const r = await runSync(true); setMessage(r ? syncMessage(r) : 'Nothing was synced.'); }, true)()}
    onResetLock={() => void act(async () => { if (await newLock()) setMessage('The lock is set up again.'); })()}
    onVoice={voice => void saveSettings(db, { voice })} onDayStyle={dayStyle => void saveSettings(db, { dayStyle })} onTheme={theme => void saveSettings(db, { theme })} onMotion={motion => void saveSettings(db, { motion })}
    onExport={act(async () => { if (!(await opened())) return; if (!(await saveFile(await makeMarkdownZip(db), `logbook-export-${today}.zip`))) return; await saveSettings(db, { lastExport: Date.now() }); setMessage('Exported. The zip holds one Markdown file per day.'); }, true)}
    onBackup={act(async () => { if (!(await opened())) return; await saveFile(await makeBackupZip(db), `logbook-backup-${today}.zip`); }, true)}
    onRestore={f => void act(async () => { if (!(await opened())) return; if (!confirm('Replace everything in Logbook with this backup?')) return; await restoreBackupFile(db, f); setMessage('Restored from the backup.'); }, true)()}
    onSource={(key, on) => void act(async () => { await saveSettings(db, { sources: { ...sourcesOf(settings), [key]: on } }); })()}
    onStarter={f => void act(async () => { await applyStarter(db, parseStarter(await f.text())); setMessage('Starter file loaded.'); })()} />;
}
