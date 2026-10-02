import { db } from '../db/db';
import { getSettings } from '../db/actions';
import { addPhotos, photosMessage } from '../db/photos';
import { sourcesOf } from '../db/stamps';
import type { Settings } from '../db/types';
import { PHOTOS_SCOPE, signIn } from '../sources/google';
import { authCall } from '../sources/http';
import { pickPhotos } from '../sources/photos';
import type { Undo } from '../db/actions';

export const googlePhotosReady = (s: Settings) => !!s.links?.googleClientId && sourcesOf(s).photos;
/* Sign in (if needed), let the owner choose in Google's picker, and add what they chose to today, with one Undo. */
export async function chooseFromGooglePhotos(): Promise<{ undo: Undo; message: string } | { message: string }> {
  const s = await getSettings(db); if (!googlePhotosReady(s)) return { message: 'Google Photos isn’t set up yet. It needs a Google client ID in your starter file.' };
  const t = await signIn(s.links!.googleClientId!, [PHOTOS_SCOPE]); if (!t) return { message: 'Sign-in didn’t finish, so no photos were added.' };
  const blobs = await pickPhotos(authCall(t), url => window.open(url, 'logbook-photos', 'popup,width=520,height=760'));
  if (!blobs.length) return { message: 'No photos were chosen.' };
  const r = await addPhotos(db, blobs, new Date());
  return r.added ? { undo: r.undo, message: photosMessage(r.added, r.failed) } : { message: photosMessage(0, r.failed) };
}
