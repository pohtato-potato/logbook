import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { getSettings } from '../../db/actions';
import { loadLookup } from '../../db/lookup';
import { dayFamilies, lifeItems, type LifeItem } from '../../domain/looking';
import { drawSmall } from '../../draw/forms';
import { Scene } from '../../draw/Canvas';
import { Icon } from '../../ui/Icons';
import { useLook } from '../../ui/Look';
import { go } from '../../router';

/* Your life at a glance: firsts, trips, moves and things from before, newest first. A bar means it lasted a while. */
export function LifeView({ items, onAdd, locked = false }: { items: LifeItem[]; onAdd(): void; locked?: boolean }) {
  const look = useLook();
  return <>
    <p className="hint">Your life at a glance. A bar under an entry means it lasted a while; “written later” means you added it afterwards.</p>
    {items.length ? <div className="life">{items.map((it, k) => <div key={it.day + k} className="lifeitem"><b>{it.year}</b>
      {it.family ? <Scene label="" draw={(ctx, w, h) => drawSmall(ctx, look, it.family!, w / 2, h / 2, Math.min(w, h) * 0.4)} /> : <span className="addico" aria-hidden="true"><Icon name={it.span ? 'k-span' : it.later ? 'k-past' : 'first'} /></span>}
      <div><p className="entry">{it.text}</p>{it.later && <p className="hint">Written later</p>}{it.span && <span className="spanbar wide" style={{ background: look.pal[it.span.family] }} aria-hidden="true" />}</div></div>)}</div>
      : <p className="entry">Your life’s big days gather here: firsts, trips, moves and things from before.</p>}
    {locked && items.some(i => i.text.startsWith('A private entry')) && <p className="hint">Private entries stay closed until you unlock.</p>}
    <button type="button" className="btn wide" onClick={onAdd}><Icon name="plus" />Add something from before</button>
  </>;
}
export function Life({ locked = false }: { locked?: boolean }) {
  const items = useLiveQuery(async () => {
    const [entries, spans, settings, moments, rows] = await Promise.all([db.entries.toArray(), db.spans.toArray(), getSettings(db), db.moments.toArray(), db.days.toArray()]);
    return lifeItems(entries, spans, settings.homes, await loadLookup(db), locked, dayFamilies(moments, rows));
  }, [locked]);
  return items ? <LifeView items={items} locked={locked} onAdd={() => go({ name: 'form', kind: 'past' })} /> : null;
}
