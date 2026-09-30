import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { pickMime, recorderSupport } from '../src/domain/recorder';
import { VoiceFormView } from '../src/screens/forms/VoiceForm';

const noop = () => {};
const view = (state: 'idle' | 'recording' | 'recorded' | 'denied' | 'unsupported', seconds = 0) => renderToStaticMarkup(<VoiceFormView state={state} seconds={seconds} onStart={noop} onStop={noop} onDiscard={noop} onKeep={noop} />);
describe('voice notes', () => {
  it('picks the first recording format the phone supports', () => {
    expect(pickMime(t => t === 'audio/webm')).toBe('audio/webm');
    expect(pickMime(t => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMime(() => false)).toBe('');
  });
  it('reports unsupported where there is no recorder (like this test runner)', () => expect(recorderSupport()).toBe('unsupported'));
  it('says so plainly when the microphone is refused, and offers nothing to keep', () => {
    const html = view('denied');
    expect(html).toContain('Logbook wasn’t allowed to use the microphone'); expect(html).not.toContain('Keep this voice note');
  });
  it('says so plainly when this browser cannot record', () => { const html = view('unsupported'); expect(html).toContain('can’t record here'); expect(html).not.toContain('Keep this voice note'); });
  it('while recording shows the time and a Stop button', () => expect(view('recording', 7)).toMatch(/0:07[^]*Stop/));
  it('after recording shows the length and Keep', () => expect(view('recorded', 42)).toMatch(/0:42[^]*Keep this voice note/));
});
