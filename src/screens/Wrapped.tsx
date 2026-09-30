import type { Entry, Moment } from '../db/types';

/* Wrapped: the month as cards (Task 5). */
export function Wrapped(_: { month: string; entries: Entry[]; moments: Moment[] }) {
  return <p className="entry">Wrapped needs a few days kept this month.</p>;
}
