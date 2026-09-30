import { useRef } from 'react';
import type { Family } from '../vocab/vocab';
import { drawForm } from '../draw/forms';
import { Scene } from '../draw/Canvas';
import { useLook } from './Look';

/* A feeling's form, drawn live. `bloom` grows it in over 2.4 s (the first run). */
export function Form({ family, second, label, bloom }: { family: Family; second?: Family; label: string; bloom?: boolean }) {
  const look = useLook(), born = useRef<number | null>(null);
  return <Scene animate label={label} draw={(ctx, w, h, t) => {
    let k = 1;
    if (bloom) { if (born.current === null) born.current = t; const u = Math.min(1, (t - born.current) / 2.4 + (t === 0 ? 1 : 0)); k = 0.25 + 0.75 * (1 - Math.pow(1 - u, 3)); }
    drawForm(ctx, look, family, w / 2, h / 2, Math.min(w, h) * 0.31 * k, t, second);
  }} />;
}
