import type { Family } from '../vocab/vocab';
export type FeelingSource = { kind: 'draft' } | { kind: 'entry'; id: number } | { kind: 'moment'; id: number } | { kind: 'none' };
export function FeelingCard(_: { word: string; src: FeelingSource; own: Record<string, Family>; onClose: () => void; onRemoveFromDraft?: (word: string) => void }) { return null; }
