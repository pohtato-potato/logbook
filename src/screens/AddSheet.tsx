import { Icon, type IconName } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { go, type FormKind } from '../router';

export const ADD_KINDS: [FormKind, string, string][] = [['photo', 'Photo', 'From your gallery'], ['quote', 'Quote', 'Said to you, or overheard'], ['place', 'Place', 'Firsts light up the map'],
  ['person', 'Person', 'Seen, called or messaged'], ['keep', 'Keepsake', 'A ticket, a note, a thing'], ['voice', 'Voice note', 'Say it instead'], ['span', 'Span', 'A trip or a stretch of days'], ['past', 'Something from before', 'Backdate a big moment']];
const icon = (k: FormKind): IconName => (k === 'photo' ? 'photo' : (`k-${k}` as IconName));
/* Everything that can be kept. Feeling, the most common, is the big button at the bottom, nearest the thumb. */
export function AddSheetView() {
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><button type="button" className="back" aria-label="Back" onClick={() => history.back()}><Icon name="back" /></button><h1 className="tdate sm">Add</h1></header>
    <div className="addgrid">{ADD_KINDS.map(([k, label, sub]) => <button key={k} type="button" className="addtile" onClick={() => go({ name: 'form', kind: k })}><span className="addico"><Icon name={icon(k)} /></span><b>{label}</b><span>{sub}</span></button>)}</div>
    <p className="hint">You can also type straight into today’s line: # for a tag, @ for a person, : for a feeling.</p>
    <button type="button" className="addtile feel" onClick={() => go({ name: 'feel', when: 'now' })}><span className="addico"><Icon name="k-feeling" /></span><b>Feeling</b><span>How you feel, now or for the day</span></button>
  </div><Tabs current="" /></div>;
}
