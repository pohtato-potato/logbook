import { useEffect, useState } from 'react';
const Q = '(min-width: 1024px)';
/* True on a laptop-wide window (1024 px and up), where Logbook opens as a reading room. */
export function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(Q).matches);
  useEffect(() => { if (typeof matchMedia === 'undefined') return; const m = matchMedia(Q), on = () => setWide(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, []);
  return wide;
}
