import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLock, lockSupport, unlock } from '../src/domain/lock';
import { maskPrivate } from '../src/domain/looking';
import { KeptCard } from '../src/screens/KeptCard';
import { PrivacyContext } from '../src/ui/Privacy';
import { searchAll } from '../src/domain/search';
import { SettingsView } from '../src/screens/Settings';
import { ShelfView } from '../src/screens/Shelves';
import { DEFAULT_SETTINGS } from '../src/db/types';

const cred = (id: number[]) => ({ rawId: new Uint8Array(id).buffer, type: 'public-key', id: 'x' }) as unknown as Credential;
const lk = { places: new Map(), spans: new Map(), people: new Map() };
const priv = { id: 1, day: '2026-09-29', at: 0, tz: 'UTC', kind: 'line' as const, text: 'the secret thing', marks: { priv: true, first: true }, tags: [], people: [], writtenAt: 0 };
const quote = { ...priv, id: 2, kind: 'quote' as const, text: 'secret words', data: { kind: 'quote' as const, who: 'Overheard', where: 'secret place' } };
const ctx = (locked: boolean) => ({ enabled: true, locked, unlock: async () => true, lockNow: () => {} });
const noop = () => {};
describe('the private lock', () => {
  it('asks for the phone’s own fingerprint or PIN, nothing else', async () => {
    let seen: CredentialCreationOptions | undefined;
    const r = await createLock({ create: async o => { seen = o; return cred([1, 2, 3]); }, get: async () => null }, 'localhost');
    expect(r.credentialId).toBe('AQID'); expect(seen?.publicKey?.authenticatorSelection).toMatchObject({ authenticatorAttachment: 'platform', userVerification: 'required' });
    await expect(createLock({ create: async () => null, get: async () => null }, 'localhost')).rejects.toThrow('couldn’t use your fingerprint or PIN');
  });
  it('unlock: yes, a cancel, or a plain error', async () => {
    let asked: CredentialRequestOptions | undefined;
    expect(await unlock({ create: async () => null, get: async o => { asked = o; return cred([1]); } }, 'localhost', 'AQID')).toBe(true);
    expect(Array.from(new Uint8Array(asked!.publicKey!.allowCredentials![0].id as ArrayBuffer))).toEqual([1, 2, 3]);
    expect(await unlock({ create: async () => null, get: async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }); } }, 'localhost', 'AQ')).toBe(false);
    await expect(unlock({ create: async () => null, get: async () => { throw new Error('x'); } }, 'localhost', 'AQ')).rejects.toThrow('couldn’t use your fingerprint or PIN');
  });
  it('a browser without a platform authenticator, or not a secure page, is not supported', async () => {
    expect(await lockSupport({ isSecureContext: true } as never)).toBe(false);
    expect(await lockSupport({ isSecureContext: false, PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: async () => true } } as never)).toBe(false);
    expect(await lockSupport({ isSecureContext: true, PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: async () => true } } as never)).toBe(true);
  });
  it('while locked, a private entry shows no text, only a quiet placeholder; unlocked, it reads as usual', () => {
    const locked = renderToStaticMarkup(<PrivacyContext.Provider value={ctx(true)}><KeptCard entry={priv} lookup={lk} own={{}} onOpenFeeling={noop} /></PrivacyContext.Provider>);
    expect(locked).not.toContain('secret'); expect(locked).toContain('A private entry. Unlock to read.');
    expect(renderToStaticMarkup(<PrivacyContext.Provider value={ctx(false)}><KeptCard entry={priv} lookup={lk} own={{}} onOpenFeeling={noop} /></PrivacyContext.Provider>)).toContain('the secret thing');
  });
  it('search and shelves keep private text out while locked', () => {
    expect(searchAll('secret', { entries: [priv], tags: [], people: [], own: {}, lookup: lk, locked: true }).lines).toEqual([]);
    expect(searchAll('secret', { entries: [priv], tags: [], people: [], own: {}, lookup: lk }).lines.length).toBe(1);
    for (const shelf of ['firsts', 'quotes'] as const) {
      const html = renderToStaticMarkup(<ShelfView shelf={shelf} entries={maskPrivate([priv, quote], true)} lookup={lk} thumbs={new Map()} places={[]} homes={[]} people={[]} spans={[]} today="2026-09-29" />);
      expect(html).not.toContain('secret'); expect(html).toContain('A private entry');
    }
  });
  it('settings: honest words, and a clear reason when this phone can’t', () => {
    const props = { message: '', onVoice: noop, onDayStyle: noop, onTheme: noop, onMotion: noop, onExport: noop, onBackup: noop, onRestore: noop, onStarter: noop, onLock: noop, onResetLock: noop };
    const cant = renderToStaticMarkup(<SettingsView {...props} settings={DEFAULT_SETTINGS} lockSupported={false} />);
    expect(cant).toMatch(/role="switch" aria-checked="false"[^>]*disabled=""/); expect(cant).toContain('This phone’s browser can’t use your fingerprint or PIN here.');
    const on = renderToStaticMarkup(<SettingsView {...props} settings={{ ...DEFAULT_SETTINGS, lock: { credentialId: 'AQ', createdAt: 0 } }} lockSupported={true} />);
    expect(on).toContain('It isn’t encryption: your phone’s own lock protects the data.'); expect(on).toContain('Set up the lock again');
  });
});
