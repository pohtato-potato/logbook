import type { CSSProperties } from 'react';
import type { Family } from '../vocab/vocab';
import { MARK_FAMILY, PERSON_THREADS, onColor, solid } from '../domain/colour';
import { Icon } from './Icons';
import { useLook } from './Look';

const v = (o: Record<string, string>) => o as CSSProperties;
/* Tags keep the colour of the feeling they usually come with, and always show their # and name. */
export function TagChip({ tag, family, onOpen }: { tag: string; family: Family; onOpen?: () => void }) {
  const { pal } = useLook();
  return <button type="button" className="tagchip" style={v({ '--tc': pal[family] })} onClick={onOpen}><b aria-hidden="true">#</b>{tag}</button>;
}
/* People show their initial, ringed in the soft thread colour chosen for them. Never a feeling colour. */
export const PersonChip = ({ initial, thread }: { initial: string; thread: number }) =>
  <span className="mention" style={v({ '--pc': PERSON_THREADS[thread % PERSON_THREADS.length] })}><b aria-hidden="true">@</b>{initial}</span>;
export function FeelingChip({ word, family, onOpen }: { word: string; family: Family; onOpen: () => void }) {
  const { pal } = useLook();
  return <button type="button" className="feelchip" style={v({ '--fc': pal[family] })} aria-label={`${word}, a feeling. Open its card`} onClick={onOpen}>{word}</button>;
}
const MARKS = { first: ['First', 'first'], gift: ['Gift', 'gift'], priv: ['Private', 'lock'], quiet: ['Don’t bring back', 'quiet'] } as const;
/* Marks keep their colours, always with their icon and word. */
export function MarkChip({ kind, on, onToggle }: { kind: keyof typeof MARKS; on: boolean; onToggle: () => void }) {
  const { pal } = useLook(), c = pal[MARK_FAMILY[kind]], fill = solid(c);
  return <button type="button" className={'mark' + (on ? ' on' : '')} aria-pressed={on} style={v(on ? { '--mc': c, background: fill, color: onColor(fill) } : { '--mc': c })} onClick={onToggle}><Icon name={MARKS[kind][1]} /><span>{MARKS[kind][0]}</span></button>;
}
