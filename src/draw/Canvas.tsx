import { useEffect, useRef } from 'react';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
const live = new Set<() => void>();
let T = 0, last = 0, running = false;
export const motion = { speed: 1 }; // Settings sets 0 (still), 1 (gentle) or 2.2 (lively)
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick(now: number) {
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; T += dt * (reduced ? 0 : motion.speed);
  live.forEach(f => f());
  if (live.size && motion.speed > 0 && !reduced && !document.hidden) requestAnimationFrame(tick); else { running = false; last = 0; }
}
export function startMotion() { if (!running && live.size && motion.speed > 0 && !reduced) { running = true; requestAnimationFrame(tick); } }
// The loop stops while the app is hidden; start it again when it comes back.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) startMotion(); });
/* One canvas, sized to its CSS box; animated scenes share one loop, and Still or reduced motion draws a single frame. */
export function Scene({ draw, animate = false, label, className }: { draw: Draw; animate?: boolean; label: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null), drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const c = ref.current, ctx = c && c.getContext('2d'); if (!c || !ctx) return;
    const paint = () => { const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return; const dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); drawRef.current(ctx, w, h, animate ? T : 0); };
    const ro = new ResizeObserver(paint); ro.observe(c); paint();
    if (animate) { live.add(paint); startMotion(); }
    return () => { ro.disconnect(); live.delete(paint); };
  }, [animate]);
  useEffect(() => { if (!animate || motion.speed === 0 || reduced) { const c = ref.current, ctx = c?.getContext('2d'); if (c && ctx && c.clientWidth) { ctx.clearRect(0, 0, c.clientWidth, c.clientHeight); drawRef.current(ctx, c.clientWidth, c.clientHeight, 0); } } });
  return <canvas ref={ref} className={className} role="img" aria-label={label} />;
}
