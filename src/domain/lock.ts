/* The private lock: the phone's own fingerprint or PIN, through a passkey that never leaves it.
   There is no server, so nothing is sent anywhere; this only asks the phone to confirm it's the owner. It hides, it doesn't encrypt. */
export class LockError extends Error { constructor() { super('Logbook couldn’t use your fingerprint or PIN. If this phone can’t any more, you can turn the lock off in Settings.'); this.name = 'PlainMessage'; } }
export type Creds = { create(o: CredentialCreationOptions): Promise<Credential | null>; get(o: CredentialRequestOptions): Promise<Credential | null> };
const b64u = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));
type Win = { isSecureContext?: boolean; PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } };
export async function lockSupport(w: Win = globalThis as unknown as Win): Promise<boolean> {
  try { return !!w.isSecureContext && !!(await w.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.()); } catch { return false; }
}
/* One user for Logbook, kept with the lock, so setting it up again replaces the passkey instead of adding another. A cancel returns null, quietly. */
export async function createLock(creds: Creds, rpId: string, userId?: string): Promise<{ credentialId: string; userId: string } | null> {
  const user = userId ? unb64u(userId) : rand(16);
  let c: Credential | null;
  try { c = await creds.create({ publicKey: { rp: { name: 'Logbook', id: rpId }, user: { id: user, name: 'logbook', displayName: 'Logbook' }, challenge: rand(32),
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60_000 } }); }
  catch (e) { if ((e as Error).name === 'NotAllowedError') return null; throw new LockError(); }
  if (!c) throw new LockError();
  return { credentialId: b64u((c as PublicKeyCredential).rawId), userId: b64u(user.buffer as ArrayBuffer) };
}
/* True when the owner confirmed; false when they cancelled. Anything else is a plain LockError. */
export async function unlock(creds: Creds, rpId: string, credentialId: string): Promise<boolean> {
  try { return !!(await creds.get({ publicKey: { challenge: rand(32), allowCredentials: [{ type: 'public-key', id: unb64u(credentialId) }], userVerification: 'required', rpId, timeout: 60_000 } })); }
  catch (e) { if ((e as Error).name === 'NotAllowedError') return false; throw new LockError(); }
}
