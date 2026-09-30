import { describe, expect, it } from 'vitest';
import weather from './fixtures/openmeteo-weather.json';
import air from './fixtures/openmeteo-air.json';
import over from './fixtures/overpass-sample.json';
import { airUrl, parseAir, parseWeather, weatherUrl } from '../src/sources/openMeteo';
import { overpassQuery, parsePlaces } from '../src/sources/overpass';

const T = '2026-09-29';
describe('Open-Meteo', () => {
  it('recent days use the forecast host, older ones the archive, with rough coordinates', () => {
    const u = new URL(weatherUrl('2026-09-28', 10.00123, 20.98765, T)!);
    expect(u.host).toBe('api.open-meteo.com'); expect(u.searchParams.get('latitude')).toBe('10'); expect(u.searchParams.get('longitude')).toBe('20.99');
    expect(u.searchParams.get('start_date')).toBe('2026-09-28');
    expect(new URL(weatherUrl('1962-05-01', 10, 20, T)!).host).toBe('archive-api.open-meteo.com');
  });
  it('asks nothing before 1940, or far in the future', () => { expect(weatherUrl('1935-01-01', 10, 20, T)).toBeNull(); expect(weatherUrl('2026-12-01', 10, 20, T)).toBeNull(); });
  it('air only from August 2022, within about three months, never ahead', () => {
    expect(airUrl('2022-07-31', 10, 20, T)).toBeNull(); expect(airUrl('2026-10-01', 10, 20, T)).toBeNull(); expect(airUrl('2026-05-01', 10, 20, T)).toBeNull();
    expect(new URL(airUrl('2026-09-29', 10, 20, T)!).host).toBe('air-quality-api.open-meteo.com');
  });
  it('parses a day’s weather and hourly air, and refuses anything garbled', () => {
    expect(parseWeather(weather)).toEqual({ code: 2, max: 31.4, min: 24.1, rain: 1.8 });
    expect(parseAir(air)?.pm2_5.length).toBe(24);
    expect(parseWeather({ daily: { weather_code: [null], temperature_2m_max: [31] } })).toBeNull();
    expect(parseWeather('<html>error</html>')).toBeNull(); expect(parseAir({})).toBeNull(); expect(parseAir(null)).toBeNull();
  });
});
describe('OpenStreetMap names', () => {
  it('posts a small nearby query with 3-decimal coordinates', () => {
    const q = overpassQuery(10.00123, 20.00987); expect(q.url).toBe('https://overpass-api.de/api/interpreter');
    expect(String(q.init.body)).toContain(encodeURIComponent('around:300,10.001,20.01').replace(/%20/g, '+'));
  });
  it('lists unique named places, nearest first', () => expect(parsePlaces(over, 10, 20)).toEqual([{ name: 'Chai Point', km: 0.2 }, { name: 'Metro Station', km: 0.4 }]));
  it('garbled answers give an empty list', () => { expect(parsePlaces('<html>', 10, 20)).toEqual([]); expect(parsePlaces({ elements: 'x' }, 10, 20)).toEqual([]); });
});
