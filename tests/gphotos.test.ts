import { describe, expect, it } from 'vitest';
import { pickPhotos, seconds } from '../src/sources/photos';
import type { AuthCall } from '../src/sources/http';

const items = { mediaItems: [
  { id: '1', type: 'PHOTO', mediaFile: { baseUrl: 'https://lh3.googleusercontent.com/a', mimeType: 'image/jpeg' } },
  { id: '2', type: 'VIDEO', mediaFile: { baseUrl: 'https://lh3.googleusercontent.com/v', mimeType: 'video/mp4' } },
  { id: '3', type: 'PHOTO', mediaFile: { baseUrl: 'https://lh3.googleusercontent.com/b', mimeType: 'image/png' } }] };
const fake = (setAfter: number) => { const log: string[] = []; let polls = 0;
  const call: AuthCall = async (url, init) => { const m = init?.method ?? 'GET'; log.push(`${m} ${url}`);
    if (m === 'POST') return { id: 'S', pickerUri: 'https://photos.google.com/picker/S', pollingConfig: { pollInterval: '2s', timeoutIn: '600s' } };
    if (m === 'DELETE') return {};
    if (url.includes('/sessions/S')) return { id: 'S', mediaItemsSet: ++polls >= setAfter };
    if (url.includes('/mediaItems')) return items;
    return new Blob(['img'], { type: url.includes('/b=') ? 'image/png' : 'image/jpeg' }); };
  return { call, log }; };
describe('Google Photos picker', () => {
  it('opens Google’s picker, waits for the choice, and brings back photos only, sized down', async () => {
    const { call, log } = fake(3), opened: string[] = [];
    const blobs = await pickPhotos(call, u => { opened.push(u); return true; }, async () => {});
    expect(opened).toEqual(['https://photos.google.com/picker/S/autoclose']); expect(blobs.length).toBe(2);
    expect(log.filter(l => l.startsWith('GET https://lh3')).map(l => l.slice(4))).toEqual(['https://lh3.googleusercontent.com/a=w1600-h1600', 'https://lh3.googleusercontent.com/b=w1600-h1600']);
    expect(log.at(-1)).toBe('DELETE https://photospicker.googleapis.com/v1/sessions/S');
  });
  it('closing the picker without choosing returns nothing and tidies up', async () => {
    const { call, log } = fake(999); let closedAfter = 0;
    expect(await pickPhotos(call, () => true, async () => {}, { gaveUp: () => ++closedAfter > 2 })).toEqual([]);
    expect(log.at(-1)).toBe('DELETE https://photospicker.googleapis.com/v1/sessions/S');
  });
  it('a blocked window is said plainly, and the session is let go', async () => {
    const { call, log } = fake(1);
    await expect(pickPhotos(call, () => false, async () => {})).rejects.toThrow('Your browser blocked Google’s window. Tap again to open it.');
    expect(log.at(-1)).toBe('DELETE https://photospicker.googleapis.com/v1/sessions/S');
  });
  it('switching Google Photos off while picking stops it before anything is fetched', async () => {
    const { call, log } = fake(3); let polls = 0;
    await expect(pickPhotos(call, () => true, async () => {}, { stillOn: async () => ++polls < 2 })).rejects.toThrow('Google Photos was switched off, so nothing was added.');
    expect(log.some(l => l.includes('lh3') || l.includes('/mediaItems'))).toBe(false); expect(log.at(-1)).toContain('DELETE');
  });
  it('reads Google’s durations', () => { expect(seconds('5s')).toBe(5); expect(seconds('1.5s')).toBe(1.5); expect(seconds(undefined, 7)).toBe(7); });
});
