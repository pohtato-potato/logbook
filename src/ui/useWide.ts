import { useEffect, useState } from 'react';
const Q = '(min-width: 68em)';
/* True on a laptop-wide window (68em, about 1088 px, and up), where Logbook opens as a reading room with room for 44 px calendar days. */
export function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(Q).matches);
  useEffect(() => { if (typeof matchMedia === 'undefined') return; const m = matchMedia(Q), on = () => setWide(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, []);
  return wide;
}
