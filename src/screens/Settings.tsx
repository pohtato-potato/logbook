import { useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSettings, saveSettings } from '../db/actions';
import { DEFAULT_SETTINGS, type Settings as S } from '../db/types';
import { makeMarkdownZip } from '../db/exportMarkdown';
import { BackupError, makeBackup, restoreBackup } from '../db/backup';
import { StarterError, applyStarter, parseStarter } from '../db/starter';
import { dayKey } from '../domain/day';
import { VOICES } from '../domain/voices';
import { Tabs } from '../ui/Tabs';

/* Save a file with the system picker where the browser has one, otherwise as a download. */
export async function saveFile(blob: Blob, name: string) {
  const w = window as unknown as { showSaveFilePicker?: (o: object) => Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }> };
  if (w.showSaveFilePicker) { try { const h = await w.showSaveFilePicker({ suggestedName: name }); const s = await h.createWritable(); await s.write(blob); await s.close(); return; } catch (e) { if ((e as Error).name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const pick = <T extends string | number,>(label: string, options: [T, string][], cur: T, on: (v: T) => void) =>
  <div className="chips" role="group" aria-label={label}>{options.map(([v, l]) => <button key={String(v)} type="button" className={'chip' + (v === cur ? ' on ink' : '')} aria-pressed={v === cur} onClick={() => on(v)}>{l}</button>)}</div>;
const Row = ({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) => <div className="setrow"><div><b>{title}</b><span>{sub}</span></div>{children}</div>;
export type SettingsProps = { settings: S; message: string; onVoice(i: number): void; onDayStyle(s: S['dayStyle']): void; onTheme(t: S['theme']): void; onMotion(m: S['motion']): void; onExport(): void; onBackup(): void; onRestore(f: File): void; onStarter(f: File): void };
export function SettingsView(p: SettingsProps) {
  const restore = useRef<HTMLInputElement>(null), starter = useRef<HTMLInputElement>(null), s = p.settings;
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
      <input ref={restore} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) p.onRestore(f); e.target.value = ''; }} />
      <Row title="Your private starter file" sub={s.starterLoaded ? 'Loaded. Load it again after changing it.' : 'Names, homes and birthdays, kept only on this phone.'}><button type="button" className="btn sm" onClick={() => starter.current?.click()}>Load</button></Row>
      <input ref={starter} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) p.onStarter(f); e.target.value = ''; }} /></section>
    <section className="panel"><h2 className="lbl">Days</h2>
      <Row title="A day ends at 4 am" sub="Late nights count as the day before." /><Row title="Weeks start on Monday" sub="Calendars begin their weeks on Monday." /></section>
  </div><Tabs current="settings" /></div>;
}
export function Settings() {
  const settings = useLiveQuery(() => getSettings(db), []) ?? DEFAULT_SETTINGS, [message, setMessage] = useState('');
  const today = dayKey(new Date());
  const act = (fn: () => Promise<unknown>) => async () => { setMessage(''); try { await fn(); } catch (e) { setMessage(e instanceof BackupError || e instanceof StarterError ? e.message : 'That didn’t work. Nothing was changed; try again.'); } };
  return <SettingsView settings={settings} message={message}
    onVoice={voice => void saveSettings(db, { voice })} onDayStyle={dayStyle => void saveSettings(db, { dayStyle })} onTheme={theme => void saveSettings(db, { theme })} onMotion={motion => void saveSettings(db, { motion })}
    onExport={act(async () => { await saveFile(await makeMarkdownZip(db), `logbook-export-${today}.zip`); await saveSettings(db, { lastExport: Date.now() }); setMessage('Exported. The zip holds one Markdown file per day.'); })}
    onBackup={act(async () => { await saveFile(new Blob([JSON.stringify(await makeBackup(db))], { type: 'application/json' }), `logbook-backup-${today}.json`); })}
    onRestore={f => void act(async () => { const data = JSON.parse(await f.text()); if (!confirm('Replace everything in Logbook with this backup?')) return; await restoreBackup(db, data); setMessage('Restored from the backup.'); })()}
    onStarter={f => void act(async () => { await applyStarter(db, parseStarter(await f.text())); setMessage('Starter file loaded.'); })()} />;
}
