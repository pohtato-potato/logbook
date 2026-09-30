import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayView, suggestedOverall } from '../src/screens/Today';
import { highlight } from '../src/screens/LineWriter';

const base = { now: new Date('2026-09-29T23:24:00'), greeting: '“Evening.”', entries: [], moments: [], foldedOpen: false, onToggleFold() {}, onConfirmOverall() {}, onChangeOverall() {}, onOpenFeeling() {}, onEntryMenu() {}, writer: <div className="writer" /> };
const m = (word: string, family: 'calm' | 'warm' | 'low', h: number) => ({ id: h, day: '2026-09-29', at: new Date(`2026-09-29T${String(h).padStart(2, '0')}:00:00`).getTime(), word, family, strength: 3 });

describe('Today', () => {
  it('at night shows only the line, inner weather and the day overall, with one Today so far row', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={true} moments={[m('calm', 'calm', 9)]} suggested={{ word: 'calm', family: 'calm', strength: 3 }} writer={<h2>Today’s line</h2>} />);
    expect(html).toContain('Today’s line');
    expect(html).toContain('Inner weather');
    expect(html).toContain('The day overall');
    expect(html).toContain('Today so far');
    expect(html).not.toContain('Grateful for');
  });
  it('during the day shows grateful for as its own section', () => {
    expect(renderToStaticMarkup(<TodayView {...base} night={false} />)).toContain('Grateful for');
  });
  it('an empty day invites the first feeling instead of showing nothing', () => {
    expect(renderToStaticMarkup(<TodayView {...base} night={false} />)).toContain('No feelings yet today');
  });
  it('never prints undefined or NaN', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={true} entries={[{ id: 1, day: '2026-09-29', at: base.now.getTime(), tz: 'UTC', kind: 'line', text: '#walk :calm :asdf', marks: { first: true }, tags: ['walk'], people: [], writtenAt: 0 }]} moments={[m('calm', 'calm', 22)]} overall={{ word: 'calm', family: 'calm', strength: 3, set: true }} />);
    expect(html).not.toMatch(/undefined|NaN/);
  });
  it('shows a kept line’s unknown :word as plain text, not a chip', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={false} entries={[{ id: 1, day: '2026-09-29', at: base.now.getTime(), tz: 'UTC', kind: 'line', text: 'hmm :asdf', marks: {}, tags: [], people: [], writtenAt: 0 }]} />);
    expect(html).toContain(':asdf');
    expect(html).not.toMatch(/feelchip[^>]*>asdf/);
  });
  it('suggests the day overall from the most-felt family', () => {
    expect(suggestedOverall([m('calm', 'calm', 9), m('close', 'warm', 18), m('content', 'calm', 20)])).toEqual({ word: 'content', family: 'calm', strength: 3 });
    expect(suggestedOverall([])).toBeUndefined();
  });
});
describe('the writing box highlight', () => {
  it('marks known feelings as chips, unknown ones as plain underlined text, and escapes HTML', () => {
    const html = highlight('<b> #walk :calm :asdf', {});
    expect(html).toContain('&lt;b&gt;');
    expect(html).toMatch(/class="h-feel"[^>]*>:calm/);
    expect(html).toMatch(/class="h-unknown"[^>]*>:asdf/);
    expect(html).toMatch(/class="h-tag"[^>]*>#walk/);
  });
});
