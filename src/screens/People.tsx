import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Person } from '../db/types';
import { addPerson, handleUses, removePerson, updatePerson } from '../db/people';
import { checkPerson, normHandle, suggestHandle } from '../domain/people';
import { PERSON_THREADS } from '../domain/colour';
import { parseDay } from '../domain/day';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { useUndo } from '../ui/Undo';
import { go } from '../router';

/* The people you mention with @: added, edited and removed here, by hand, beside the private starter file. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const Back = () => <button type="button" className="back" aria-label="Back" onClick={() => history.back()}><Icon name="back" /></button>;
const bdayWords = (mmdd?: string) => (mmdd ? parseDay(`2000-${mmdd}`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '');
export function PeopleView({ people, onAdd, onEdit }: { people: Person[]; onAdd(): void; onEdit(id: string): void }) {
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><Back /><h1 className="tdate sm">People</h1></header>
    <button type="button" className="btn primary wide" onClick={onAdd}>Add a person</button>
    <section className="panel">{sorted.length ? sorted.map(p => <div key={p.id} className="setrow">
      <span className="face" style={{ ['--pc' as string]: PERSON_THREADS[p.thread % PERSON_THREADS.length] }} aria-hidden="true">{p.initial}</span>
      <div><b>{p.name}</b><span>@{p.initial}{p.birthday ? ` · Birthday ${bdayWords(p.birthday)}` : ''}</span></div>
      <button type="button" className="btn sm" aria-label={`Edit ${p.name}`} onClick={() => onEdit(p.id)}>Edit</button></div>)
      : <p className="entry">No people yet. Add the people you spend time with, and mention them in a line with @ and their short name.</p>}</section>
    <p className="hint">People from your private starter file show here too. Loading the starter file again updates their names and birthdays and adds anyone new; it never removes anyone.</p>
  </div><Tabs current="shelves" /></div>;
}
export type PersonForm = { name: string; handle: string; day: string; month: string };
export function PersonEditView({ form, isNew, error, handleLocked, onChange, onSave, onCancel, onRemove }: { form: PersonForm; isNew: boolean; error: string; handleLocked?: string; onChange(f: Partial<PersonForm>): void; onSave(): void; onCancel(): void; onRemove?(): void }) {
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><Back /><h1 className="tdate sm">{isNew ? 'Add a person' : 'Edit person'}</h1></header>
    {error && <p className="panel entry" role="alert">{error}</p>}
    <section className="panel pform">
      <label className="field"><span>Name</span><input className="sinput" value={form.name} autoComplete="off" onChange={e => onChange({ name: e.target.value })} /></label>
      <label className="field"><span>Short name, for @</span><input className="sinput" value={form.handle} maxLength={3} autoComplete="off" autoCapitalize="words" disabled={!!handleLocked} aria-describedby="h-handle" onChange={e => onChange({ handle: normHandle(e.target.value) })} /></label>
      <p className="hint" id="h-handle">{handleLocked ?? `1 to 3 letters. Type @${form.handle || 'Ri'} in a line to mention them.`}</p>
      <fieldset className="field bday"><legend>Birthday (optional)</legend>
        <div className="row2b">
          <label><span className="sr">Day</span><select className="sinput" value={form.day} onChange={e => onChange({ day: e.target.value })}><option value="">Day</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>)}</select></label>
          <label><span className="sr">Month</span><select className="sinput" value={form.month} onChange={e => onChange({ month: e.target.value })}><option value="">Month</option>{MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}</select></label>
        </div></fieldset>
    </section>
    <div className="pbtns"><button type="button" className="btn primary" onClick={onSave}>{isNew ? 'Add' : 'Save'}</button><button type="button" className="btn ghost" onClick={onCancel}>Cancel</button></div>
    {onRemove && <><button type="button" className="btn ghost wide danger" onClick={onRemove}>Remove {form.name || 'this person'}</button>
      <p className="hint">Lines that mention them keep their @ letters.</p></>}
  </div><Tabs current="shelves" /></div>;
}
export function People() {
  const people = useLiveQuery(() => db.people.toArray(), []) ?? [];
  return <PeopleView people={people} onAdd={() => go({ name: 'person-edit' })} onEdit={id => go({ name: 'person-edit', id })} />;
}
export function PersonEdit({ id }: { id?: string }) {
  const undo = useUndo(), people = useLiveQuery(() => db.people.toArray(), []);
  const [form, setForm] = useState<PersonForm | null>(id ? null : { name: '', handle: '', day: '', month: '' }), [error, setError] = useState(''), [locked, setLocked] = useState<string>();
  const [handleTouched, setHandleTouched] = useState(false);
  useEffect(() => {
    if (!id || form) return;
    void (async () => {
      const p = await db.people.get(id); if (!p) { setError('That person isn’t in Logbook any more.'); return; }
      setForm({ name: p.name, handle: p.initial, day: p.birthday?.slice(3, 5) ?? '', month: p.birthday?.slice(0, 2) ?? '' }); setHandleTouched(true);
      const n = await handleUses(db, p.initial); if (n) setLocked(`@${p.initial} is in ${n} ${n === 1 ? 'entry' : 'entries'}, so it stays the same. That keeps every mention pointing at them.`);
    })();
  }, [id, form]);
  if (!form) return <div className="scr">{error && <p className="panel entry" role="alert">{error}</p>}</div>;
  const others = (people ?? []).filter(p => p.id !== id);
  const change = (f: Partial<PersonForm>) => {
    setError('');
    if ('handle' in f) setHandleTouched(true);
    const next = { ...form, ...f };
    if ('name' in f && !handleTouched && !id) next.handle = suggestHandle(next.name, others.map(p => p.initial)); // suggested until they type their own
    setForm(next);
  };
  const birthday = form.day && form.month ? `${form.month}-${form.day}` : undefined;
  const save = async () => {
    if ((form.day && !form.month) || (!form.day && form.month)) { setError('Pick both the day and the month, or neither.'); return; }
    const d = { name: form.name, handle: form.handle, birthday }, bad = checkPerson(d, others); if (bad) { setError(bad); return; }
    try {
      if (id) { undo.show(await updatePerson(db, id, d), `Saved ${form.name.trim()}.`, { carry: true }); history.back(); }
      else { const r = await addPerson(db, d); undo.show(r.undo, `Added ${form.name.trim()}. Mention them with @${normHandle(form.handle)}.`, { carry: true }); go({ name: 'people' }); }
    } catch (e) { setError((e as Error).name === 'PlainMessage' ? (e as Error).message : 'That didn’t save. Nothing changed; try again.'); }
  };
  const remove = id ? async () => {
    if (!confirm(`Remove ${form.name} from Logbook? Lines that mention them keep their @ letters.`)) return;
    try { undo.show(await removePerson(db, id), `Removed ${form.name}.`, { carry: true }); go({ name: 'people' }); } catch (e) { setError((e as Error).message); }
  } : undefined;
  return <PersonEditView form={form} isNew={!id} error={error} handleLocked={locked} onChange={change} onSave={() => void save()} onCancel={() => history.back()} onRemove={remove} />;
}
