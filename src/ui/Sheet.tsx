import { useEffect, useRef, type ReactNode } from 'react';

/* A sheet over the screen: focus moves into it, and Escape closes it. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button, input, textarea')?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [onClose]);
  return <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref}>{children}</div>;
}
