import { describe, expect, it } from 'vitest';
import { dayLengthMin, dayLengthWords, moonOf, sunTimes } from '../src/domain/sun';

const near = (ms: number, iso: string, min = 3) => expect(Math.abs(ms - Date.parse(iso)) / 60000).toBeLessThan(min);
describe('sun', () => {
  it('London at midsummer: rises about 3:43 and sets about 20:21 UTC', () => {
    const s = sunTimes('2026-06-21', 51.5074, -0.1278); if (typeof s === 'string') throw new Error(s);
    near(s.rise, '2026-06-21T03:43:00Z'); near(s.set, '2026-06-21T20:21:00Z');
  });
  it('New Delhi at the equinox: about 6:10 am and 6:17 pm IST', () => {
    const s = sunTimes('2026-09-23', 28.6139, 77.209); if (typeof s === 'string') throw new Error(s);
    near(s.rise, '2026-09-23T00:40:00Z', 5); near(s.set, '2026-09-23T12:47:00Z', 5);
  });
  it('midnight sun and polar night say so', () => {
    expect(sunTimes('2026-06-21', 78.22, 15.65)).toBe('up-all-day');
    expect(sunTimes('2026-12-21', 78.22, 15.65)).toBe('down-all-day');
  });
  it('day length in words', () => {
    expect(dayLengthWords(716, 717)).toBe('11 h 56 m, a minute shorter');
    expect(dayLengthWords(600, 597)).toBe('10 h 0 m, 3 minutes longer');
    expect(dayLengthWords(600, 600)).toBe('10 h 0 m, about the same');
    expect(dayLengthWords(600, null)).toBe('10 h 0 m');
    expect(dayLengthMin('2026-06-21', 78.22, 15.65)).toBeNull();
  });
});
describe('moon', () => {
  it('is full on 26 September 2026 and new on 6 January 2000', () => {
    expect(moonOf(Date.UTC(2026, 8, 26, 12)).words).toBe('Full moon');
    expect(moonOf(Date.UTC(2000, 0, 6, 18)).words).toBe('New moon');
  });
  it('a waning gibbous moon reads in words with its light', () => expect(moonOf(Date.UTC(2026, 8, 29, 12)).words).toMatch(/^Waning, \d+% lit$/));
});
