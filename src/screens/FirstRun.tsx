import { useRef, useState } from 'react';
import { db } from '../db/db';
import { StarterError, applyStarter, parseStarter } from '../db/starter';
import { VOICES } from '../domain/voices';
import { Form } from '../ui/Form';
import { go } from '../router';

export type FirstRunProps = { step: 1 | 2 | 3; message: string; onBegin(): void; onStarter(f: File): void; onSkip(): void; onDone(): void };
/* The first run: a form blooms and the Archivist speaks; one skippable step; then the first line. */
export function FirstRunView(p: FirstRunProps) {
  const file = useRef<HTMLInputElement>(null);
  if (p.step === 1) return <div className="scr"><div className="content scroll firstrun">
    <div className="fr-bloom"><Form family="warm" bloom label="A warm form, blooming" /></div>
    <p className="fr-voice">“Evening. I’m the Archivist. I keep the small things, so you don’t have to.”</p>
    <p className="entry center">Everything stays on this phone unless you say otherwise.</p>
    <button type="button" className="btn primary big" onClick={p.onBegin}><span>Begin</span></button></div></div>;
  if (p.step === 2) return <div className="scr"><div className="content scroll">
    <header className="thead"><h1 className="tdate sm">One small thing</h1><p className="tstamp">It can wait. Skip it if you like.</p></header>
    <section className="panel"><h2 className="lbl">Your private starter file</h2><p className="entry">Names, homes and birthdays live in a file only you keep. Logbook reads it once and keeps it on this phone.</p>
      {p.message && <p className="hint" role="alert">{p.message}</p>}
      <div className="btnrow"><button type="button" className="btn primary" onClick={() => file.current?.click()}>Choose the file</button><button type="button" className="btn ghost" onClick={p.onSkip}>Later</button></div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) p.onStarter(f); e.target.value = ''; }} /></section></div></div>;
  return <div className="scr"><div className="content scroll">
    <header className="thead"><h1 className="tdate sm">Tonight’s first line</h1><p className="voice">{VOICES[0].greeting}</p></header>
    <p className="entry">One line is plenty. Type # for a tag, @ for a person, : for a feeling.</p>
    <button type="button" className="btn primary big" onClick={p.onDone}><span>Write it</span></button></div></div>;
}
export function FirstRun() {
  const [step, setStep] = useState<1 | 2 | 3>(1), [message, setMessage] = useState('');
  return <FirstRunView step={step} message={message} onBegin={() => setStep(2)}
    onStarter={async f => { setMessage(''); try { await applyStarter(db, parseStarter(await f.text())); setStep(3); } catch (e) { setMessage(e instanceof StarterError ? e.message : 'That file couldn’t be read. Nothing was changed.'); } }}
    onSkip={() => { try { localStorage.setItem('logbook-first-run-skipped', '1'); } catch { /* ignore */ } setStep(3); }}
    onDone={() => go({ name: 'today' })} />;
}
