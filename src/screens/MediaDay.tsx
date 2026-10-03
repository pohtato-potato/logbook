import type { MediaDay } from '../shelf/shelf';

/* Media's day (media.day v1 from the shelf): what was watched, read, played or listened to, with each rating as it stood that day.
   Films, books and shows live in Media now; each one opens there. */
const KIND: Record<string, string> = { film: 'Film', show: 'Show', manga: 'Manga', album: 'Album', lit: 'Book', game: 'Game', essay: 'Essay', article: 'Article' };
/* What happened, without repeating "rated" when the rating itself is shown. */
const did = (i: MediaDay['items'][number]) => i.did.filter(d => !(d === 'rated' && i.rating != null)).join(', ');
export function MediaDayView({ day }: { day: MediaDay }) {
  return <section className="panel mediaday" aria-label="From Media">
    <div className="hp-head"><span>From Media</span><span>{day.items.length} {day.items.length === 1 ? 'thing' : 'things'}</span></div>
    <ul className="md-items">{day.items.map(i => <li key={i.workId}>
      <a href={`../media/#/work/${encodeURIComponent(i.workId)}`}><b>{i.title}</b></a>
      <span className="hint">{KIND[i.kind] ?? i.kind} · {did(i)}{i.rating != null ? ` · rated ${i.rating}` : ''}</span>
      {i.line && <p className="entry">“{i.line}”</p>}
    </li>)}</ul>
    {day.feelings.length > 0 && <p className="hint">Felt: {day.feelings.map(f => f.w).join(', ')}</p>}
  </section>;
}

/* The same day in the Markdown export. */
export function mediaDayMarkdown(day: MediaDay): string {
  const lines = ['## From Media', ''];
  for (const i of day.items) lines.push(`- ${i.title} — ${did(i)}${i.rating != null ? `, rated ${i.rating}` : ''}${i.line ? `: “${i.line}”` : ''}`);
  if (day.feelings.length) lines.push('', `Felt: ${day.feelings.map(f => f.w).join(', ')}`);
  return lines.join('\n') + '\n';
}
