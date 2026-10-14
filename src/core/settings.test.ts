import { describe, expect, it } from 'vitest';
import { defaultSettings, detectLanguage, sanitizeSettings } from './settings';

describe('settings', () => {
  it('defaults: punch in/out nearest 15', () => {
    const s = defaultSettings();
    expect(s.rounding.in).toEqual({ mode: 'nearest', interval: 15 });
    expect(s.rounding.out).toEqual({ mode: 'nearest', interval: 15 });
  });

  it('German defaults use 24h and Monday', () => {
    const s = defaultSettings('de');
    expect(s.timeFormat).toBe('24h');
    expect(s.weekStartsOn).toBe(1);
  });

  it('sanitize keeps valid values and repairs invalid ones', () => {
    const s = sanitizeSettings({
      timeFormat: '24h',
      rounding: { out: { mode: 'up', interval: 6 }, breakEnd: { mode: 'down', interval: 99999 } },
      targets: { workdays: [5, 1, 1, 9] },
      rate: { currency: 'euro' },
      unknown: true,
    });
    expect(s.timeFormat).toBe('24h');
    expect(s.rounding.out).toEqual({ mode: 'up', interval: 6 });
    expect(s.rounding.breakEnd.interval).toBe(1440);
    expect(s.targets.workdays).toEqual([1, 5]);
    expect(s.rate.currency).toBe('USD');
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
  });

  it('detects language', () => {
    expect(detectLanguage(['de-AT', 'en'])).toBe('de');
    expect(detectLanguage(['fr-FR', 'en-GB'])).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
  });
});
