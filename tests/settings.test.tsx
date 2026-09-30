import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsView } from '../src/screens/Settings';
import { FirstRunView } from '../src/screens/FirstRun';
import { DEFAULT_SETTINGS } from '../src/db/types';

const noop = () => {};
describe('settings', () => {
  it('has voices, the day page, theme, motion, export and backup, and states the day rules', () => {
    const html = renderToStaticMarkup(<SettingsView settings={DEFAULT_SETTINGS} message="" onVoice={noop} onDayStyle={noop} onTheme={noop} onMotion={noop} onExport={noop} onBackup={noop} onRestore={noop} onStarter={noop} />);
    for (const s of ['Archivist', 'Conspiracy theorist', 'Bloom', 'Score', 'Dark', 'Light', 'Still', 'Gentle', 'Export everything', 'Save a backup', 'Restore a backup', 'A day ends at 4 am', 'Weeks start on Monday', 'Text size follows your phone'])
      expect(html).toContain(s);
  });
  it('shows a plain message after a problem', () => {
    expect(renderToStaticMarkup(<SettingsView settings={DEFAULT_SETTINGS} message="This file isn’t a Logbook backup. Nothing was changed." onVoice={noop} onDayStyle={noop} onTheme={noop} onMotion={noop} onExport={noop} onBackup={noop} onRestore={noop} onStarter={noop} />)).toContain('role="alert"');
  });
});
describe('first run', () => {
  it('opens with the Archivist, then the starter file step, then the first line', () => {
    expect(renderToStaticMarkup(<FirstRunView step={1} message="" onBegin={noop} onStarter={noop} onSkip={noop} onDone={noop} />)).toContain('I’m the Archivist');
    const s2 = renderToStaticMarkup(<FirstRunView step={2} message="" onBegin={noop} onStarter={noop} onSkip={noop} onDone={noop} />);
    expect(s2).toContain('Your private starter file');
    expect(s2).toContain('Later');
    expect(renderToStaticMarkup(<FirstRunView step={3} message="" onBegin={noop} onStarter={noop} onSkip={noop} onDone={noop} />)).toContain('Tonight’s first line');
  });
});
