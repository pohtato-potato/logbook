import { useEffect, useRef } from 'react';
import { addDays, dayKey } from '../domain/day';
import { go, type Route } from '../router';

export type KeyTarget = { tagName?: string; isContentEditable?: boolean } | null;
export type KeyAct = 'search' | 'write' | 'prev' | 'next' | 'calendar' | 'today' | 'close';
/* The laptop keys. They never fire while typing (except Escape), or with Ctrl, Cmd or Alt held. "g" waits for one more key. */
export function keyAction(e: { key: string; target: KeyTarget; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; modal?: boolean; repeat?: boolean }, pending: string | null): { action?: KeyAct; pending: string | null } {
  if (e.key === 'Escape') return { action: 'close', pending: null };
  const t = e.target, typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName ?? '') || !!t.isContentEditable);
  if (typing || e.ctrlKey || e.metaKey || e.altKey || e.modal || e.repeat) return { pending: null }; // an open dialog keeps the keys; a held key doesn't repeat moves
  const k = e.key.toLowerCase();
  if (pending === 'g') return k === 'c' ? { action: 'calendar', pending: null } : k === 't' ? { action: 'today', pending: null } : { pending: null };
  if (k === 'g') return { pending: 'g' };
  const single: Record<string, KeyAct> = { '/': 'search', n: 'write', arrowleft: 'prev', arrowright: 'next' };
  return single[k] ? { action: single[k], pending: null } : { pending: null };
}
/* Mounted once: turns the keys into moves. Arrow keys move between days on Today and day pages only. */
export function useKeys(route: Route, enabled: boolean) {
  const pending = useRef<string | null>(null), routeRef = useRef(route); routeRef.current = route;
  useEffect(() => {
    if (!enabled) return;
    const on = (e: KeyboardEvent) => {
      const r = keyAction({ key: e.key, target: e.target as KeyTarget, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, repeat: e.repeat, modal: !!document.querySelector('[aria-modal="true"]') }, pending.current); pending.current = r.pending;
      const here = routeRef.current, day = here.name === 'day' ? here.day : here.name === 'today' ? dayKey(new Date()) : null;
      switch (r.action) {
        case 'search': e.preventDefault(); go({ name: 'search' }); break;
        case 'write': { const box = document.querySelector<HTMLTextAreaElement>('[data-write]'); if (box) { e.preventDefault(); box.focus(); } else { go({ name: 'today' }); } break; }
        case 'prev': if (day) go({ name: 'day', day: addDays(day, -1) }); break;
        case 'next': if (day && here.name === 'day') { const next = addDays(day, 1); go(next >= dayKey(new Date()) ? { name: 'today' } : { name: 'day', day: next }); } break;
        case 'calendar': go({ name: 'cal' }); break;
        case 'today': go({ name: 'today' }); break;
      }
    };
    addEventListener('keydown', on); return () => removeEventListener('keydown', on);
  }, [enabled]);
}
