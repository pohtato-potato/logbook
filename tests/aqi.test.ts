import { describe, expect, it } from 'vitest';
import { airWords, indianAqi, weatherWords } from '../src/domain/aqi';

const flat = (v: number) => Array(24).fill(v);
describe('Indian AQI (CPCB)', () => {
  it('PM2.5 of 100 is poor at 232 and leads', () => {
    const a = indianAqi({ pm10: flat(80), pm2_5: flat(100), no2: flat(30), so2: flat(10), co: flat(800), o3: flat(40) })!;
    expect(a).toEqual({ aqi: 232, category: 'Poor', lead: 'PM2.5' });
    expect(airWords(a)).toBe('232, poor (India scale)');
  });
  it('band edges: PM10 of 100 is 100, of 101 is 101', () => {
    expect(indianAqi({ pm10: flat(100), pm2_5: flat(5), no2: flat(5), so2: flat(5), co: flat(100), o3: flat(5) })?.aqi).toBe(100);
    expect(indianAqi({ pm10: flat(101), pm2_5: flat(5), no2: flat(5), so2: flat(5), co: flat(100), o3: flat(5) })?.aqi).toBe(101);
  });
  it('clean air is good', () => expect(indianAqi({ pm10: flat(20), pm2_5: flat(10), no2: flat(10), so2: flat(5), co: flat(300), o3: flat(20) })?.category).toBe('Good'));
  it('too few valid hours or no particulate data gives nothing, never NaN', () => {
    expect(indianAqi({ pm10: [], pm2_5: [], no2: flat(10), so2: flat(5), co: flat(300), o3: flat(20) })).toBeNull();
    expect(indianAqi({ pm10: Array(24).fill(NaN), pm2_5: [1, 2], no2: flat(10), so2: flat(5), co: flat(300), o3: flat(20) })).toBeNull();
  });
  it('severe stays within 500', () => expect(indianAqi({ pm10: flat(900), pm2_5: flat(600), no2: flat(10), so2: flat(5), co: flat(300), o3: flat(20) })?.aqi).toBe(500));
});
describe('weather words', () => {
  it.each([[0, 'Clear'], [2, 'Partly cloudy'], [45, 'Fog'], [63, 'Rain'], [95, 'Thunderstorm'], [7, 'Weather']])('%i', (c, w) => expect(weatherWords(c)).toBe(w));
});
