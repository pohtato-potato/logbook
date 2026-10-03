import { useEffect, useRef, useState, type KeyboardEvent, type MutableRefObject } from 'react';
import { db } from '../db/db';
import { keepLine, StorageFullError } from '../db/actions';
import { feelingsOf, removeFeelingToken, restoreDraft, tokenize, tokenAt } from '../domain/line';
import { cardsFor, putCards } from '../shelf/shelf';
import { catalogueWorks, mentionCards, workSuggestions, type CatalogueWork } from '../shelf/media';
import { feelingOf, searchFeelings, FAMILY_NAME, type Family } from '../vocab/vocab';
import { palette, PERSON_THREADS } from '../domain/colour';
import { MarkChip } from '../ui/Chips';
import { useUndo } from '../ui/Undo';
import { useLook } from '../ui/Look';
import type { Marks, Person } from '../db/types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* The mirror behind the textarea: the same text, with tags, people and feelings painted in. Unknown :words stay plain, underlined. */
export function highlight(text: string, own: Record<string, Family>, people: Person[] = [], pal: Record<Family | 'fog', string> = palette('dark')): string {
  let out = '', i = 0;
  for (const t of tokenize(text)) {
    out += esc(text.slice(i, t.start));
    if (t.kind === 'tag') out += `<mark class="h-tag">${esc(t.raw)}</mark>`;
    else if (t.kind === 'person') { const p = people.find(q => q.initial === t.value); out += p ? `<mark class="h-person" style="--pc:${PERSON_THREADS[p.thread % PERSON_THREADS.length]}">${esc(t.raw)}</mark>` : esc(t.raw); }
    else { const x = feelingOf(t.value, own); out += x ? `<mark class="h-feel" style="--fc:${pal[x.family]}">${esc(t.raw)}</mark>` : `<mark class="h-unknown">${esc(t.raw)}</mark>`; }
    i = t.end;
  }
  return out + esc(text.slice(i)) + '\n';
}
type Sugg = { label: string; insert: string; note: string; family?: Family };
const STARTERS = ['calm', 'content', 'tired', 'anxious', 'grateful', 'nostalgic'];
export function LineWriter({ own, people, tags, onOpenFeeling, removerRef }: { own: Record<string, Family>; people: Person[]; tags: string[]; onOpenFeeling: (word: string) => void; removerRef?: MutableRefObject<((word: string) => void) | null> }) {
  const [text, setText] = useState(() => (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('logbook-draft')) || '');
  const [marks, setMarks] = useState<Marks>({});
  const [sugg, setSugg] = useState<{ items: Sugg[]; start: number } | null>(null);
  const [error, setError] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null), undo = useUndo(), { pal } = useLook();
  // Media's catalogue, for / (films, books and shows live in Media now). Empty when Media hasn't left one.
  const [works, setWorks] = useState<CatalogueWork[]>([]);
  useEffect(() => { void cardsFor('logbook', 'media.catalogue').then(r => setWorks(catalogueWorks(r))).catch(() => {}); }, []);
  useEffect(() => { try { sessionStorage.setItem('logbook-draft', text); } catch { /* private mode: the draft just isn't remembered */ } }, [text]);
  const current = useRef(text); current.current = text;
  if (removerRef) removerRef.current = word => {
    const before = text, after = removeFeelingToken(text, word); let done = false; setText(after);
    undo.show({ label: 'Removed', run: async () => { if (done) return; done = true; const back = restoreDraft({ before, after, current: current.current }); if (back !== null) setText(back); } }, `Removed ${word} from your line.`);
  };
  const suggest = (value: string, caret: number) => {
    const m = value.slice(0, caret).match(/(^|\s)([#@:/])([\p{L}\p{N}_'-]*)$/u);
    if (!m) return setSugg(null);
    const q = m[3].toLowerCase(), start = caret - m[3].length - 1;
    let items: Sugg[] = [];
    if (m[2] === '#') { items = tags.filter(t => t.startsWith(q)).slice(0, 5).map(t => ({ label: '#' + t, insert: '#' + t, note: '' })); if (q && !tags.includes(q)) items.push({ label: `Make a new tag, #${q}`, insert: '#' + q, note: '' }); }
    else if (m[2] === '/') items = workSuggestions(q, works).map(w => ({ label: '/' + w.title, insert: '/' + w.title, note: `in Media${w.year ? `, ${w.year}` : ''}` }));
    else if (m[2] === '@') items = people.filter(p => p.initial.toLowerCase().startsWith(q)).map(p => ({ label: `@${p.initial}, ${p.name}`, insert: '@' + p.initial, note: '' }));
    else items = (q ? searchFeelings(q, own, 6) : STARTERS.map(w => ({ w, family: feelingOf(w, own)!.family, note: '', kind: 'atlas' as const })))
      .map(h => ({ label: h.w, insert: ':' + h.w.replace(/ /g, '-'), note: FAMILY_NAME[h.family] + (h.note.startsWith('means') ? ', ' + h.note : ''), family: h.family }));
    setSugg(items.length ? { items, start } : null);
  };
  const apply = (s: Sugg) => {
    const el = ta.current; if (!el || !sugg) return;
    const at = sugg.start, next = text.slice(0, at) + s.insert + ' ' + text.slice(el.selectionStart);
    setText(next); setSugg(null);
    requestAnimationFrame(() => { const p = at + s.insert.length + 1; el.focus(); el.setSelectionRange(p, p); });
  };
  const busy = useRef(false); // a second tap while saving does nothing
  const keep = async () => {
    if (!text.trim() || busy.current) return; setError(''); busy.current = true;
    try {
      const r = await keepLine(db, { text, marks, at: new Date() }, own);
      // A line that names a work with / goes to that work in Media too (a logbook.mention card).
      try { const e = await db.entries.get(r.entryId); const cards = mentionCards(text.trim(), works, feelingsOf(text, own), e?.day ?? '', e?.uid ?? String(r.entryId)); if (cards.length && e) await putCards(cards); } catch { /* the line is kept either way */ }
      setText(''); setMarks({}); try { sessionStorage.removeItem('logbook-draft'); } catch { /* ignore */ }
      const added = r.momentId ? ' Your feelings were added to your inner weather.' : '';
      undo.show(r.undo, `Kept.${added}${r.skipped.length ? ` ${r.skipped.join(', ')} was already there from the last hour.` : ''}`);
    } catch (e) { setError(e instanceof StorageFullError ? e.message : 'That didn’t save. Your words are still in the box; try Keep again.'); }
    finally { busy.current = false; }
  };
  /* A chosen feeling behaves as one piece: tapping it opens its card, and one Backspace removes it. */
  const onClick = () => {
    const el = ta.current; if (!el) return;
    const tk = tokenAt(text, el.selectionStart);
    if (tk?.kind === 'feeling' && text[tk.end] === ' ' && feelingOf(tk.value, own)) { onOpenFeeling(tk.value); return; }
    suggest(text, el.selectionStart);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void keep(); return; }
    const el = e.currentTarget; if (e.key !== 'Backspace' || el.selectionStart !== el.selectionEnd) return;
    const pos = el.selectionStart, tk = tokenAt(text, pos) ?? tokenAt(text, pos - 1);
    if (tk?.kind === 'feeling' && feelingOf(tk.value, own) && (pos === tk.end || (pos === tk.end + 1 && text[tk.end] === ' '))) {
      e.preventDefault(); const cut = pos === tk.end + 1 ? tk.end + 1 : tk.end;
      setText(text.slice(0, tk.start) + text.slice(cut)); requestAnimationFrame(() => el.setSelectionRange(tk.start, tk.start));
    }
  };
  return <section className="panel compose" aria-labelledby="h-line">
    <h2 className="lbl" id="h-line">Today’s line</h2>
    <div className="composer">
      <div className="hl" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlight(text, own, people, pal) }} />
      <textarea data-write ref={ta} value={text} placeholder="Today in a line, or a few…" aria-label="Today’s line" aria-describedby="h-hint"
        onChange={e => { setText(e.target.value); suggest(e.target.value, e.target.selectionStart); }} onClick={onClick} onKeyDown={onKeyDown}
        onScroll={e => { const hl = e.currentTarget.previousElementSibling as HTMLElement | null; if (hl) hl.scrollTop = e.currentTarget.scrollTop; }}
        onBlur={() => setTimeout(() => setSugg(null), 150)} />
      {sugg && <div className="sugg">{sugg.items.map((s, i) => <button key={i + s.insert} type="button" onMouseDown={e => e.preventDefault()} onClick={() => apply(s)}>
        {s.family ? <i className="sdot" style={{ background: pal[s.family] }} /> : <i className="sdot ring" />}<span>{s.label}{s.note && <small>{s.note}</small>}</span></button>)}</div>}
    </div>
    <p className="hint" id="h-hint">Type # for a tag, @ for a person, : for a feeling, / for a film, book or show in Media. Tap a feeling to see its card.</p>
    <div className="marks" role="group" aria-label="Marks for this entry">
      {(['first', 'gift', 'priv', 'quiet'] as const).map(k => <MarkChip key={k} kind={k} on={!!marks[k]} onToggle={() => setMarks({ ...marks, [k]: !marks[k] })} />)}
    </div>
    {error && <p className="hint" role="alert">{error}</p>}
    <button type="button" className="btn primary wide" disabled={!text.trim()} onClick={keep}>Keep this line</button>
  </section>;
}
