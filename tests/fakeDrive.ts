import type { AuthCall, AuthSend } from '../src/sources/http';

/* A small in-memory Google Drive: enough of files.list / create / get?alt=media and resumable uploads for the sync tests. */
type F = { id: string; name: string; parents: string[]; mimeType: string; modifiedTime: string; body: Blob };
export function fakeDrive() {
  const files = new Map<string, F>(), sessions = new Map<string, { id?: string; name: string; parents: string[]; type: string; parts: Blob[] }>();
  let n = 0, tick = 0; const log: string[] = [];
  const stamp = () => new Date(1_800_000_000_000 + ++tick * 1000).toISOString();
  const match = (f: F, q: string) => {
    const name = q.match(/name='([^']+)'/)?.[1], parent = q.match(/'([^']+)' in parents/)?.[1], mime = q.match(/mimeType='([^']+)'/)?.[1];
    return (!name || f.name === name) && (!parent || f.parents.includes(parent)) && (!mime || f.mimeType === mime);
  };
  const call: AuthCall = async (url, init) => {
    const u = new URL(url), m = init?.method ?? 'GET'; log.push(`${m} ${u.pathname}${u.searchParams.get('alt') ? '?alt' : ''}`);
    if (u.pathname === '/drive/v3/files' && m === 'GET') { const q = u.searchParams.get('q') ?? ''; return { files: [...files.values()].filter(f => match(f, q)).map(({ id, name, modifiedTime }) => ({ id, name, modifiedTime })) }; }
    if (u.pathname === '/drive/v3/files' && m === 'POST') { const b = JSON.parse(String(init!.body)); const f: F = { id: 'f' + ++n, name: b.name, parents: b.parents ?? [], mimeType: b.mimeType, modifiedTime: stamp(), body: new Blob([]) }; files.set(f.id, f); return { id: f.id }; }
    const id = u.pathname.split('/').pop()!, f = files.get(id); if (!f) throw new Error('404 ' + id);
    if (u.searchParams.get('alt') === 'media') return f.mimeType.includes('json') ? JSON.parse(await f.body.text()) : f.body;
    return { id };
  };
  const send: AuthSend = async (url, init) => {
    const u = new URL(url), h = (init?.headers ?? {}) as Record<string, string>;
    if (u.searchParams.get('uploadType') === 'resumable') {
      const meta = JSON.parse(String(init!.body)), sid = 's' + ++n, id = u.pathname.startsWith('/upload/drive/v3/files/') ? u.pathname.split('/').pop() : undefined;
      sessions.set(sid, { id, name: meta.name, parents: meta.parents ?? [], type: h['X-Upload-Content-Type'], parts: [] });
      return new Response(null, { status: 200, headers: { Location: `https://www.googleapis.com/upload/session/${sid}` } });
    }
    const s = sessions.get(u.pathname.split('/').pop()!)!; s.parts.push(init!.body as Blob);
    const [, end, total] = h['Content-Range'].match(/bytes \d+-(\d+)\/(\d+)/)!.map(Number);
    if (end + 1 < total) return new Response(null, { status: 308 });
    const body = new Blob(s.parts, { type: s.type }), old = s.id ? files.get(s.id) : undefined;
    const f: F = old ? { ...old, body, modifiedTime: stamp() } : { id: 'f' + ++n, name: s.name, parents: s.parents, mimeType: s.type, modifiedTime: stamp(), body };
    files.set(f.id, f); log.push(`UPLOAD ${f.name}`); return new Response('{}', { status: 200 });
  };
  return { g: { call, send }, files, log };
}
