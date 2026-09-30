import { db } from '../db/db';
import { removeEntry } from '../db/actions';
import { Sheet } from '../ui/Sheet';
import { useUndo } from '../ui/Undo';

/* The ⋯ sheet for one kept entry, on Today and on the day page: remove it (with Undo), or close. */
export function EntryMenu({ id, onClose }: { id: number; onClose(): void }) {
  const undo = useUndo();
  return <Sheet label="This entry" onClose={onClose}><p className="tdate sm">This entry</p><div className="btnrow col">
    <button type="button" className="btn danger wide" onClick={async () => { onClose(); try { undo.show(await removeEntry(db, id), 'Removed.'); } catch (e) { undo.fail(e); } }}>Remove it</button>
    <button type="button" className="btn primary wide" onClick={onClose}>Close</button></div></Sheet>;
}
