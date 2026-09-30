import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSettings, setHeadline } from '../db/actions';
import { addDays, dayKey, parseDay } from '../domain/day';
import { monthLines, onThisDay, randomDay, weekLineSuggestion, weekOf, yearReport, type Report } from '../domain/almanac';
import { EMPTY_LOOKUP, dateRange, entryLine } from '../domain/entryText';
import { dayFamilies, maskMoments, maskPrivate, yearDays } from '../domain/looking';
import { drawSmall } from '../draw/forms';
import { drawYearRing, type YearDay } from '../draw/year';
import { Scene } from '../draw/Canvas';
import { FAMILIES, FAMILY_NAME, type Family } from '../vocab/vocab';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { useLook } from '../ui/Look';
import { usePrivacy } from '../ui/Privacy';
import { useUndo } from '../ui/Undo';
import { useNow } from '../ui/useNow';
import { ALM_TABS, go, type AlmTab } from '../router';
import { Wrapped } from './Wrapped';

const TAB_NAME: Record<AlmTab, string> = { report: 'Report', headlines: 'Headlines', wrapped: 'Wrapped', random: 'A random day' };
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const long = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const dm = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
function Form({ family }: { family: Family }) { const look = useLook(); return <Scene label="" draw={(ctx, w, h) => drawSmall(ctx, look, family, w / 2, h / 2, Math.min(w, h) * 0.4)} />; }
/* The Almanac describes the year, like a small newspaper about you. It never predicts. */
export function AlmanacView({ tab, mast, children }: { tab: AlmTab; mast: { issue: number; year: number; kept: number }; children: ReactNode }) {
  return <div className="scr"><div className="content scroll">
    <header className="mast"><h1 className="mast-t">The Almanac</h1><p className="mast-s"><span>No. {mast.issue}</span><span>{mast.year}, so far</span><span>{mast.kept} {mast.kept === 1 ? 'day' : 'days'} kept</span></p></header>
    <div className="ctabs" role="tablist" aria-label="Almanac">{ALM_TABS.map(k => <button key={k} type="button" role="tab" aria-selected={k === tab} className={k === tab ? 'on' : ''} onClick={() => go({ name: 'almanac', tab: k })}>{TAB_NAME[k]}</button>)}</div>
    {children}
  </div><Tabs current="almanac" /></div>;
}
/* The year in numbers and "Notable" things: what was, never best or worst. */
export function ReportView({ report, days, today, voice, topFamily }: { report: Report; days: YearDay[]; today: string; voice: number; topFamily?: Family }) {
  const look = useLook(), kept = days.filter(d => d.family).length, ti = days.findIndex(d => d.day === today);
  return <>
    <p className="headline">{report.headline}</p>
    {kept > 0 && <div className="rep-hero"><Scene label={`The year so far as a ring: ${kept} ${kept === 1 ? 'day' : 'days'} kept.`} draw={(ctx, w, h) => drawYearRing(ctx, look, w, h, days, ti, -1)} /></div>}
    {report.numbers.length > 0 && <div className="rep-row">{report.numbers.map(x => <div key={x.label} className="rep-cell"><span className="rn">{x.n}</span><span className="rl">{x.label}</span><span className="rq">{x.sub}</span></div>)}</div>}
    {report.notable.length > 0 && <section className="records"><h2 className="lbl">Notable</h2>{report.notable.map(x => <div key={x.text} className="rec"><span className="rn">{x.first ? <Icon name="first" /> : x.n}</span><p>{x.text}</p></div>)}</section>}
    {voice % 8 === 7 && topFamily && <div className="rep-fore"><h2 className="lbl">Outlook for next month, from the Conspiracy theorist</h2>
      <p className="entry">“They say 70% {FAMILY_NAME[topFamily].toLowerCase()}. Who is ‘they’? Exactly.”</p><p className="hint">A joke. Logbook never predicts how you’ll feel.</p></div>}
  </>;
}
/* This week in a line (kept on Sunday), past weeks, and the year in twelve lines. */
export function HeadlinesView({ today, value, suggestion, onValue, onKeep, weeks, months, year }: { today: string; value: string; suggestion: string; onValue(v: string): void; onKeep(): void;
  weeks: { label: string; line: string; suggested: boolean }[]; months: { month: string; family?: Family; line: string }[]; year: number }) {
  return <>
    <section className="panel prompt"><h2 className="lbl">{WEEKDAY[parseDay(today).getDay()]}: this week in a line</h2>
      <input className="sinput" value={value} placeholder={suggestion} aria-label="This week in a line" onChange={e => onValue(e.target.value)} />
      <p className="hint">Logbook suggests one from your week if you leave it blank.</p>
      <button type="button" className="btn primary wide" disabled={!value.trim()} onClick={onKeep}>Keep this week’s line</button></section>
    <section className="panel"><h2 className="lbl">Weeks</h2>{weeks.map(w => <div key={w.label} className="hline"><b>{w.label}</b><span>{w.line}{w.suggested && <i className="hint"> (suggested)</i>}</span></div>)}</section>
    <section className="panel"><h2 className="lbl">{year} in twelve lines, so far</h2>{months.map(m => <div key={m.month} className="hline">{m.family ? <Form family={m.family} /> : <span aria-hidden="true" />}<div><b>{m.month}</b><span>{m.line}</span></div></div>)}</section>
  </>;
}
/* A random day from any time, and then-and-now for today's date. */
export function RandomView({ pick, enough, onAnother, onOpen, today, then, now }: { pick: { day: string; family?: Family; line?: string } | null; enough: boolean; onAnother(): void; onOpen(day: string): void; today: string;
  then: { year: number; line: string } | null; now: { line: string } | null }) {
  return <>
    <section className="panel"><h2 className="lbl">A random day</h2>
      {!enough || !pick ? <p className="entry">A random day needs a few more days kept.</p> : <>
        <p className="tdate sm">{long(pick.day)}</p><div className="rrow">{pick.family ? <Form family={pick.family} /> : <span aria-hidden="true" />}<p className="entry">{pick.line ?? 'A day with feelings, and no lines.'}</p></div>
        <div className="btnrow"><button type="button" className="btn primary" onClick={onAnother}>Another day</button><button type="button" className="btn" onClick={() => onOpen(pick.day)}>Open this day</button></div></>}</section>
    <section className="panel"><h2 className="lbl">Then and now, {dm(today)}</h2>
      {then || now ? <div className="thennow"><div><b>{then ? then.year : 'Before'}</b><p className="entry">{then ? then.line : 'Nothing kept on this date before.'}</p></div>
        <div><b>{today.slice(0, 4)}</b><p className="entry">{now ? now.line : 'Nothing kept today yet.'}</p></div></div> : <p className="entry">Nothing kept on this date in any year yet.</p>}</section>
  </>;
}
export function Almanac({ tab = 'report' }: { tab?: AlmTab }) {
  const now = useNow(), today = dayKey(now), year = Number(today.slice(0, 4)), undo = useUndo(), { locked } = usePrivacy();
  const [line, setLine] = useState(''), [seed, setSeed] = useState(() => Math.random());
  const d = useLiveQuery(async () => {
    const [rawEntries, rawMoments, rows, places, people, settings] = await Promise.all([db.entries.toArray(), db.moments.toArray(), db.days.toArray(), db.places.toArray(), db.people.toArray(), getSettings(db)]);
    const entries = maskPrivate(rawEntries, locked), moments = maskMoments(rawMoments, rawEntries, locked);
    const kept = [...new Set([...moments.map(m => m.day), ...entries.map(e => e.day)])].sort(), first = kept[0];
    return { entries, moments, rows, places, people, voice: settings.voice, kept, issue: first ? Math.max(1, (year - Number(first.slice(0, 4))) * 12 + Number(today.slice(5, 7)) - Number(first.slice(5, 7)) + 1) : 1 };
  }, [locked, today]);
  if (!d) return <div className="scr" />;
  const mast = { issue: d.issue, year, kept: d.kept.filter(x => x.startsWith(String(year))).length };
  const lineOf = (day: string) => { const e = [...d.entries].filter(x => x.day === day && !x.marks.quiet && !(locked && x.marks.priv)).sort((a, b) => a.at - b.at)[0]; return e && entryLine(e, EMPTY_LOOKUP); };
  let body: ReactNode;
  if (tab === 'report') {
    const fams = dayFamilies(d.moments.filter(m => m.day.startsWith(String(year))), d.rows), n = new Map<Family, number>();
    fams.forEach(f => n.set(f.family, (n.get(f.family) ?? 0) + 1));
    const topFamily = [...FAMILIES].filter(f => n.get(f)).sort((a, b) => n.get(b)! - n.get(a)!)[0];
    body = <ReportView report={yearReport(year, d)} days={yearDays(year, fams)} today={today} voice={d.voice} topFamily={topFamily} />;
  } else if (tab === 'headlines') {
    const wk = weekOf(today), suggestion = weekLineSuggestion(d.entries, d.moments, wk), weeks: { label: string; line: string; suggested: boolean }[] = [];
    for (let k = 0, s = wk.start; k < 8; k++, s = addDays(s, -7)) {
      const w = { start: s, end: addDays(s, 6) }, saved = d.rows.find(r => r.day === w.end)?.headline, sug = weekLineSuggestion(d.entries, d.moments, w);
      if (!saved && sug === 'A quiet week.' && k > 0) continue;
      weeks.push({ label: dateRange(w.start, w.end), line: saved ?? sug, suggested: !saved });
    }
    body = <HeadlinesView today={today} value={line} suggestion={suggestion} onValue={setLine} weeks={weeks} months={monthLines(year, d.entries, d.moments, today)} year={year}
      onKeep={async () => { try { undo.show(await setHeadline(db, wk.end, line), 'Kept this week’s line.'); setLine(''); } catch (e) { undo.fail(e); } }} />;
  } else if (tab === 'wrapped') body = <Wrapped month={today.slice(0, 7)} entries={d.entries} moments={d.moments} people={d.people} />;
  else {
    const quietDays = new Set(d.kept.filter(day => { const es = d.entries.filter(e => e.day === day); return es.length > 0 && es.every(e => e.marks.quiet || (locked && e.marks.priv)); }));
    const pickDay = randomDay(d.kept.filter(x => x !== today), () => seed, quietDays), fams = dayFamilies(d.moments, d.rows), then = onThisDay(d.entries.filter(e => !(locked && e.marks.priv)), today)[0], nowLine = lineOf(today);
    body = <RandomView enough={d.kept.length >= 2} today={today} onAnother={() => setSeed(Math.random())} onOpen={day => go({ name: 'day', day })}
      pick={pickDay ? { day: pickDay, family: fams.get(pickDay)?.family, line: lineOf(pickDay) } : null}
      then={then ? { year: then.year, line: entryLine(then.entry, EMPTY_LOOKUP) } : null} now={nowLine ? { line: nowLine } : null} />;
  }
  return <AlmanacView tab={tab} mast={mast}>{body}</AlmanacView>;
}
