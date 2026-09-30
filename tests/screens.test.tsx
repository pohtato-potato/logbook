import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayView } from '../src/screens/Today';
import { FeelingPickerView } from '../src/screens/FeelingPicker';
import { DayPageView } from '../src/screens/DayPage';
import { CalendarView } from '../src/screens/Calendar';
import { SettingsView } from '../src/screens/Settings';
import { FirstRunView } from '../src/screens/FirstRun';
import { DEFAULT_SETTINGS } from '../src/db/types';
import { FAMILIES } from '../src/vocab/vocab';

const noop = () => {};
const bad = /undefined|NaN|\[object Object\]/;
describe('every screen renders cleanly', () => {
  it('Today in both states, with and without data', () => {
    for (const night of [true, false]) for (const moments of [[], [{ id: 1, day: 'd', at: 0, word: 'calm', family: 'calm' as const, strength: 3 }]])
      expect(renderToStaticMarkup(<TodayView now={new Date('2026-09-29T23:00:00')} greeting="g" night={night} entries={[]} moments={moments} foldedOpen={false} onToggleFold={noop} onConfirmOverall={noop} onChangeOverall={noop} onOpenFeeling={noop} onEntryMenu={noop} writer={null} />)).not.toMatch(bad);
  });
  it('the picker for every family, now and whole day', () => {
    for (const fam of FAMILIES) for (const when of ['now', 'day'] as const)
      expect(renderToStaticMarkup(<FeelingPickerView when={when} fam={fam} word="" strength={5} about="" query="" own={{ mine: fam }} onWhen={noop} onFam={noop} onWord={noop} onStrength={noop} onAbout={noop} onBlend={noop} onQuery={noop} onOwnWord={noop} onKeep={noop} />)).not.toMatch(bad);
  });
  it('day page, calendar, settings and first run', () => {
    for (const style of ['bloom', 'score'] as const) expect(renderToStaticMarkup(<DayPageView day="2026-09-29" style={style} entries={[]} moments={[]} own={{}} />)).not.toMatch(bad);
    expect(renderToStaticMarkup(<CalendarView month="2026-02" today="2026-02-28" days={{}} open={null} onOpen={noop} onMonth={noop} />)).not.toMatch(bad);
    expect(renderToStaticMarkup(<SettingsView settings={DEFAULT_SETTINGS} message="" onVoice={noop} onDayStyle={noop} onTheme={noop} onMotion={noop} onExport={noop} onBackup={noop} onRestore={noop} onStarter={noop} />)).not.toMatch(bad);
    for (const step of [1, 2, 3] as const) expect(renderToStaticMarkup(<FirstRunView step={step} message="" onBegin={noop} onStarter={noop} onSkip={noop} onDone={noop} />)).not.toMatch(bad);
  });
});
