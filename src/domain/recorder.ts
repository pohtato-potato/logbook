export const recorderSupport = (): 'ok' | 'unsupported' => (typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined' ? 'ok' : 'unsupported');
/* The first format this phone can record: Opus in WebM on Android and desktop, MP4 on iPhones. */
export const pickMime = (isSupported: (t: string) => boolean) => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(isSupported) ?? '';
/* Opens the microphone and starts recording. Any failure after the microphone opened releases it again, so its indicator never stays on. */
export async function openRecorder(getStream: () => Promise<MediaStream>, make: (s: MediaStream) => MediaRecorder): Promise<{ stream: MediaStream; rec: MediaRecorder }> {
  let stream: MediaStream;
  try { stream = await getStream(); } catch (e) { const n = (e as Error).name; throw new Error(n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : 'unsupported'); }
  try { const rec = make(stream); rec.start(); return { stream, rec }; }
  catch { stream.getTracks().forEach(t => t.stop()); throw new Error('unsupported'); }
}
