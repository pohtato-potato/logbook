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

/* The Undo notice belongs to the screen it was shown on: moving to another screen clears it. */
function ClearUndoOnMove({ at }: { at: string }) { const { moved } = useUndo(); useEffect(() => { moved(); }, [at, moved]); return null; }
export function App() {
  const r = useRoute();
  const settings = useLiveQuery(() => getSettings(db), []) ?? DEFAULT_SETTINGS;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    // Very large phone text: the tab bar keeps only its icons, drawn bigger, so labels never collide.
    root.toggleAttribute('data-big-text', parseFloat(getComputedStyle(root).fontSize) > 18);
    motion.speed = settings.motion === 'still' ? 0 : settings.motion === 'lively' ? 2.2 : 1; startMotion();
  }, [settings.theme, settings.motion]);
  return <div id="app-root"><LookProvider value={lookOf(settings.theme)}><UndoProvider>
    <ClearUndoOnMove at={JSON.stringify(r)} />
    {r.name === 'today' && <Today />}
    {r.name === 'cal' && <Calendar month={r.month} />}
    {r.name === 'day' && <DayPage day={r.day} />}
    {r.name === 'feel' && <FeelingPicker when={r.when} word={r.word} />}
    {r.name === 'settings' && <Settings />}
    {r.name === 'first-run' && <FirstRun />}
  </UndoProvider></LookProvider></div>;
}
