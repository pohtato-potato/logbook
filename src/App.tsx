import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRoute } from './router';
import { UndoProvider, useUndo } from './ui/Undo';
import { LookProvider } from './ui/Look';
import { lookOf } from './draw/forms';
import { motion, startMotion } from './draw/Canvas';
import { db } from './db/db';
import { getSettings } from './db/actions';
import { DEFAULT_SETTINGS } from './db/types';
import { Today } from './screens/Today';
import { Calendar } from './screens/Calendar';
import { DayPage } from './screens/DayPage';
import { FeelingPicker } from './screens/FeelingPicker';
import { Settings } from './screens/Settings';
import { FirstRun } from './screens/FirstRun';
import { AddSheetView } from './screens/AddSheet';
import { FormScreen } from './screens/forms/FormScreen';
import { Shelf, Shelves } from './screens/Shelves';
import { Person } from './screens/Person';
import { TagPage } from './screens/TagPage';
import { Search } from './screens/Search';
import { Almanac } from './screens/Almanac';
import { ShareSheet } from './screens/ShareSheet';
import { Desk } from './screens/Desk';
import { useWide } from './ui/useWide';
import { useKeys } from './ui/keys';
import { PrivacyProvider } from './ui/Privacy';
import { UpdateNotice } from './pwa';

/* The Undo notice belongs to the screen it was shown on: moving to another screen clears it. */
function ClearUndoOnMove({ at }: { at: string }) { const { moved } = useUndo(); useEffect(() => { moved(); }, [at, moved]); return null; }
export function App() {
  const r = useRoute(), wide = useWide();
  useKeys(r, wide);
  const settings = useLiveQuery(() => getSettings(db), []) ?? DEFAULT_SETTINGS;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    // Very large phone text: the tab bar keeps only its icons, drawn bigger, so labels never collide.
    const big = () => root.toggleAttribute('data-big-text', parseFloat(getComputedStyle(root).fontSize) > 18);
    big(); addEventListener('resize', big);
    motion.speed = settings.motion === 'still' ? 0 : settings.motion === 'lively' ? 2.2 : 1; startMotion();
    return () => removeEventListener('resize', big);
  }, [settings.theme, settings.motion]);
  return <div id="app-root"><LookProvider value={lookOf(settings.theme)}><UndoProvider><PrivacyProvider>
    <ClearUndoOnMove at={JSON.stringify(r)} />
    {r.name === 'today' && (wide ? <Desk route={r}><Today /></Desk> : <Today />)}
    {r.name === 'cal' && <Calendar month={r.month} tab={r.tab} />}
    {r.name === 'day' && (wide ? <Desk route={r}><DayPage day={r.day} /></Desk> : <DayPage day={r.day} />)}
    {r.name === 'feel' && <FeelingPicker when={r.when} word={r.word} />}
    {r.name === 'add' && <AddSheetView />}
    {r.name === 'form' && <FormScreen key={r.kind} kind={r.kind} />}
    {r.name === 'shelves' && <Shelves />}
    {r.name === 'shelf' && <Shelf shelf={r.shelf} />}
    {r.name === 'person' && <Person id={r.id} />}
    {r.name === 'tag' && <TagPage tag={r.tag} />}
    {r.name === 'search' && <Search />}
    {r.name === 'almanac' && <Almanac tab={r.tab} />}
    {r.name === 'share' && <ShareSheet />}
    {r.name === 'settings' && <Settings />}
    {r.name === 'first-run' && <FirstRun />}
    <UpdateNotice />
  </PrivacyProvider></UndoProvider></LookProvider></div>;
}
