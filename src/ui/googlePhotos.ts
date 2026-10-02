import { db } from '../db/db';
import { getSettings } from '../db/actions';
import { addPhotos, photosMessage } from '../db/photos';
import { sourcesOf } from '../db/stamps';
import type { Settings } from '../db/types';
import { PHOTOS_SCOPE, signIn, token } from '../sources/google';
import { authCall } from '../sources/http';
import { pickPhotos } from '../sources/photos';
import type { Undo } from '../db/actions';

export const googlePhotosReady = (s: Settings) => !!s.links?.googleClientId && sourcesOf(s).photos;
/* Let the owner choose in Google's picker and add what they chose to the day they tapped on, with one Undo.
   The picker's window is opened at once, inside the tap, so the browser doesn't block it. Signing in uses up that tap,
   so the first time it signs in and asks for one more tap. */
export async function chooseFromGooglePhotos(): Promise<{ undo: Undo; message: string } | { message: string }> {
  const at = new Date(), t0 = token([PHOTOS_SCOPE]);
  const w = t0 ? window.open('about:blank', 'logbook-photos', 'popup,width=520,height=760') : null;
  if (t0 && !w) return { message: 'Your browser blocked Google’s window. Tap again to open it.' };
  const s = await getSettings(db); if (!googlePhotosReady(s)) { w?.close(); return { message: 'Google Photos isn’t set up yet. It needs a Google client ID in your starter file.' }; }
  if (!t0) { const t = await signIn(s.links!.googleClientId!, [PHOTOS_SCOPE]); return { message: t ? 'Signed in to Google. Tap “Choose from Google Photos” again to pick.' : 'Sign-in didn’t finish, so no photos were added.' }; }
  let blobs: Blob[];
  try {
    blobs = await pickPhotos(authCall(t0), url => { try { w!.location.href = url; return true; } catch { return false; } }, undefined, {
      gaveUp: () => w!.closed && document.hasFocus(), // Google's page can make its window look closed; believe it only once Logbook is in front again
      stillOn: async () => googlePhotosReady(await getSettings(db)) });
  } finally { if (w && !w.closed) w.close(); }
  if (!blobs.length) return { message: 'No photos were chosen.' };
  const r = await addPhotos(db, blobs, at);
  return r.added ? { undo: r.undo, message: photosMessage(r.added, r.failed) } : { message: photosMessage(0, r.failed) };
}
