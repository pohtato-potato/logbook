export const recorderSupport = (): 'ok' | 'unsupported' => (typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined' ? 'ok' : 'unsupported');
/* The first format this phone can record: Opus in WebM on Android and desktop, MP4 on iPhones. */
export const pickMime = (isSupported: (t: string) => boolean) => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(isSupported) ?? '';
