import type { AuthCall } from './http';

/* Google Photos suggestions, through Google's own Photos Picker: the owner chooses photos in Google's window;
   Logbook gets only those, sized down to 1600 px, and then lets the picking session go. */
const API = 'https://photospicker.googleapis.com/v1';
export const seconds = (d: string | undefined, fallback = 5) => { const n = d ? parseFloat(d) : NaN; return Number.isFinite(n) && n > 0 ? n : fallback; };
type Session = { id: string; pickerUri: string; mediaItemsSet?: boolean; pollingConfig?: { pollInterval?: string; timeoutIn?: string } };
type Item = { type?: string; mediaFile?: { baseUrl?: string; mimeType?: string } };
const nap = (s: number) => new Promise<void>(r => setTimeout(r, s * 1000));
const plain = (m: string) => Object.assign(new Error(m), { name: 'PlainMessage' });
/* Returns the chosen photos (an empty list when the owner gave up without choosing). `open` shows Google's picker and says whether it could;
   `gaveUp` says the owner closed it and came back; `stillOn` reads the Google Photos switch, checked before every poll and before fetching. */
export async function pickPhotos(call: AuthCall, open: (url: string) => boolean, sleep: (s: number) => Promise<void> = nap, o: { gaveUp?: () => boolean; stillOn?: () => Promise<boolean> } = {}): Promise<Blob[]> {
  const gaveUp = o.gaveUp ?? (() => false), stillOn = async () => { if (o.stillOn && !(await o.stillOn())) throw plain('Google Photos was switched off, so nothing was added.'); };
  const s = (await call(`${API}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })) as Session;
  try {
    if (!open(`${s.pickerUri}/autoclose`)) throw plain('Your browser blocked Google’s window. Tap again to open it.');
    const every = seconds(s.pollingConfig?.pollInterval), until = Date.now() + Math.min(seconds(s.pollingConfig?.timeoutIn, 600), 900) * 1000;
    let set = false;
    while (!set && Date.now() < until) {
      await sleep(every); await stillOn();
      set = !!((await call(`${API}/sessions/${s.id}`)) as Session).mediaItemsSet;
      if (!set && gaveUp()) { set = !!((await call(`${API}/sessions/${s.id}`)) as Session).mediaItemsSet; if (!set) return []; }
    }
    if (!set) return [];
    await stillOn();
    const items: Item[] = []; let page = '';
    do { const r = (await call(`${API}/mediaItems?${new URLSearchParams({ sessionId: s.id, pageSize: '100', ...(page ? { pageToken: page } : {}) })}`)) as { mediaItems?: Item[]; nextPageToken?: string };
      items.push(...(r.mediaItems ?? [])); page = r.nextPageToken ?? ''; } while (page);
    const out: Blob[] = [];
    for (const it of items.filter(i => i.type === 'PHOTO' && i.mediaFile?.baseUrl)) { const b = await call(`${it.mediaFile!.baseUrl}=w1600-h1600`); if (b instanceof Blob) out.push(b.type ? b : new Blob([b], { type: it.mediaFile!.mimeType ?? 'image/jpeg' })); }
    return out;
  } finally { try { await call(`${API}/sessions/${s.id}`, { method: 'DELETE' }); } catch { /* it expires on its own */ } }
}
