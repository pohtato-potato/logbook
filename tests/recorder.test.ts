import { describe, expect, it } from 'vitest';
import { openRecorder } from '../src/domain/recorder';

const fakeStream = () => { const t = { stopped: false, stop() { t.stopped = true; } }; return { t, stream: { getTracks: () => [t] } as unknown as MediaStream }; };
describe('the microphone is never left on', () => {
  it('if the recorder cannot start, the microphone is released and it says unsupported', async () => {
    const { t, stream } = fakeStream();
    await expect(openRecorder(async () => stream, () => { throw new Error('no'); })).rejects.toThrow('unsupported');
    expect(t.stopped).toBe(true);
  });
  it('a refused microphone says denied', async () => {
    await expect(openRecorder(async () => { throw Object.assign(new Error('x'), { name: 'NotAllowedError' }); }, () => ({}) as MediaRecorder)).rejects.toThrow('denied');
  });
  it('when it works, returns the stream and the started recorder', async () => {
    const { stream } = fakeStream(); let started = false;
    const r = await openRecorder(async () => stream, () => ({ start() { started = true; } }) as unknown as MediaRecorder);
    expect(r.stream).toBe(stream); expect(started).toBe(true);
  });
});
