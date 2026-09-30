import { useEffect, useRef, useState } from 'react';
import { db } from '../../db/db';
import { keepEntry } from '../../db/actions';
import { minSec } from '../../domain/entryText';
import { openRecorder, pickMime, recorderSupport } from '../../domain/recorder';
import { go } from '../../router';
import { Icon } from '../../ui/Icons';
import { useUndo } from '../../ui/Undo';
import { BlobAudio } from '../../ui/Blob';
import { FormFrame } from './index';

type State = 'idle' | 'recording' | 'recorded' | 'denied' | 'unsupported';
const MAX_SECONDS = 300;
/* Say it instead. The microphone is used only while recording, after the browser's own permission prompt; the note stays on the phone. */
export function VoiceFormView({ state, seconds, audio, onStart, onStop, onDiscard, onKeep }: { state: State; seconds: number; audio?: Blob; onStart(): void; onStop(): void; onDiscard(): void; onKeep(): void }) {
  const done = state === 'recorded';
  return <FormFrame title="Voice note" keepLabel={done ? 'Keep this voice note' : undefined} keepSub={done ? `${minSec(seconds)} long` : undefined} onKeep={onKeep}>
    {state === 'idle' && <><button type="button" className="micbtn" aria-label="Start recording" onClick={onStart}><Icon name="k-voice" /></button><p className="hint center">Tap to record, up to five minutes. Voice notes stay on your phone as audio.</p></>}
    {state === 'recording' && <><p className="tdate sm center" aria-live="polite">Recording, {minSec(seconds)}</p><button type="button" className="btn primary big wide" onClick={onStop}>Stop</button></>}
    {done && <><p className="entry center">Recorded, {minSec(seconds)}</p>{audio && <BlobAudio blob={audio} label="Listen back" />}<button type="button" className="btn ghost wide" onClick={onDiscard}>Discard and record again</button></>}
    {state === 'denied' && <p className="entry" role="alert">Logbook wasn’t allowed to use the microphone. You can allow it in the browser’s site settings, or write a line instead.</p>}
    {state === 'unsupported' && <p className="entry" role="alert">This browser can’t record here. You can write a line instead.</p>}
  </FormFrame>;
}
export function VoiceForm() {
  const undo = useUndo(), [state, setState] = useState<State>(() => (recorderSupport() === 'ok' ? 'idle' : 'unsupported'));
  const [seconds, setSeconds] = useState(0), [audio, setAudio] = useState<Blob>();
  const rec = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), timer = useRef<number>(0), started = useRef(0), busy = useRef(false);
  const release = () => { clearInterval(timer.current); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => () => { if (rec.current?.state === 'recording') { rec.current.onstop = null; rec.current.stop(); } release(); }, []);
  const stop = () => { if (rec.current?.state === 'recording') rec.current.stop(); };
  const start = async () => {
    if (busy.current || rec.current?.state === 'recording') return; busy.current = true;
    try {
      const mime = pickMime(t => MediaRecorder.isTypeSupported(t)), chunks: Blob[] = [];
      const o = await openRecorder(() => navigator.mediaDevices.getUserMedia({ audio: true }), s => {
        const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
        r.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        r.onstop = () => { release(); setSeconds(Math.max(1, Math.round((Date.now() - started.current) / 1000))); setAudio(new Blob(chunks, { type: r.mimeType || mime || 'audio/webm' })); setState('recorded'); };
        return r;
      });
      stream.current = o.stream; rec.current = o.rec; started.current = Date.now(); setSeconds(0); setState('recording');
      timer.current = window.setInterval(() => { const s = Math.round((Date.now() - started.current) / 1000); setSeconds(s); if (s >= MAX_SECONDS) stop(); }, 500);
    } catch (e) { setState((e as Error).message === 'denied' ? 'denied' : 'unsupported'); }
    finally { busy.current = false; }
  };
  const keep = async () => {
    if (!audio || busy.current) return; busy.current = true;
    try { const r = await keepEntry(db, { kind: 'voice', text: '', data: { kind: 'voice', audio, seconds, type: audio.type }, at: new Date() }); undo.show(r.undo, 'Kept your voice note in today.', { carry: true }); go({ name: 'today' }); }
    catch (e) { undo.fail(e); } finally { busy.current = false; }
  };
  return <VoiceFormView state={state} seconds={seconds} audio={audio} onStart={() => void start()} onStop={stop} onDiscard={() => { setAudio(undefined); setSeconds(0); setState('idle'); }} onKeep={() => void keep()} />;
}
