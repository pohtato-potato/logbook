import { describe, expect, it } from 'vitest';
import { addDays, dayKey, isNight, parseDay, timeLabel, weekStartOf } from '../src/domain/day';

const at = (s: string) => new Date(s); // local time, no Z

describe('dayKey', () => {
  it('belongs to the same date during the day', () => expect(dayKey(at('2026-09-29T13:00:00'))).toBe('2026-09-29'));
  it('belongs to the previous day before 4 am', () => {
    expect(dayKey(at('2026-09-30T00:30:00'))).toBe('2026-09-29');
    expect(dayKey(at('2026-09-30T03:59:59'))).toBe('2026-09-29');
  });
  it('starts the new day at 4 am', () => expect(dayKey(at('2026-09-30T04:00:00'))).toBe('2026-09-30'));
  it('crosses a month and a year', () => {
    expect(dayKey(at('2026-10-01T02:00:00'))).toBe('2026-09-30');
    expect(dayKey(at('2027-01-01T01:00:00'))).toBe('2026-12-31');
  });
});

describe('isNight', () => {
  it('is night from 12 am to before 5 am', () => {
    expect(isNight(at('2026-09-30T00:00:00'))).toBe(true);
    expect(isNight(at('2026-09-30T04:30:00'))).toBe(true);
    expect(isNight(at('2026-09-30T05:00:00'))).toBe(false);
    expect(isNight(at('2026-09-29T23:59:00'))).toBe(false);
  });
});

describe('calendar helpers', () => {
  it('adds days across months', () => expect(addDays('2026-09-29', 3)).toBe('2026-10-02'));
  it('weeks start on Monday', () => {
    expect(weekStartOf('2026-09-29')).toBe('2026-09-28'); // Tuesday -> Monday
    expect(weekStartOf('2026-10-04')).toBe('2026-09-28'); // Sunday -> the Monday before
    expect(weekStartOf('2026-09-28')).toBe('2026-09-28');
  });
  it('parses to local noon so time zones never shift the date', () => expect(parseDay('2026-09-29').getHours()).toBe(12));
  it('labels times in 12-hour style', () => {
    expect(timeLabel(at('2026-09-29T23:24:00'))).toBe('11:24 pm');
    expect(timeLabel(at('2026-09-29T00:05:00'))).toBe('12:05 am');
  });
});
