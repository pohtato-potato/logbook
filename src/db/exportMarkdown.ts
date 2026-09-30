import type { LogbookDb } from './db';
import { dayToMarkdown } from '../domain/markdown';
import { makeZip } from '../domain/zip';

const README = '# Logbook export\n\nOne Markdown file per day, in year and month folders. Open them with any text editor.\n';
export async function makeMarkdownZip(db: LogbookDb): Promise<Blob> {
  const [entries, moments, days] = await Promise.all([db.entries.toArray(), db.moments.toArray(), db.days.toArray()]);
  const keys = [...new Set([...entries.map(e => e.day), ...moments.map(m => m.day), ...days.map(d => d.day)])].sort();
  const files = keys.map(k => ({ path: `${k.slice(0, 4)}/${k.slice(5, 7)}/${k}.md`, data: dayToMarkdown(k, days.find(d => d.day === k), entries.filter(e => e.day === k), moments.filter(m => m.day === k)) }));
  return makeZip([{ path: 'README.md', data: README }, ...files]);
}
