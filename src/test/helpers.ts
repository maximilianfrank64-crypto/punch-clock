import { defaultSettings } from '../core/settings';
import type { Settings, Shift } from '../core/types';

/** Local wall-clock time (test TZ is Europe/Berlin) as epoch ms. */
export const at = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) =>
  new Date(y, mo - 1, d, h, mi, s).getTime();

export const hm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const MIN = 60_000;
export const HOUR = 3_600_000;

/** Settings with rounding off, so tests control times exactly. */
export function plainSettings(patch: Partial<Settings> = {}): Settings {
  const s = defaultSettings('en');
  const off = { mode: 'off', interval: 1 } as const;
  return {
    ...s,
    weekStartsOn: 1,
    rounding: { in: off, out: off, breakStart: off, breakEnd: off },
    ...patch,
  };
}

let n = 0;
export function shift(
  start: number,
  end: number | null,
  breaks: [number, number | null][] = [],
  extra: Partial<Shift> = {},
): Shift {
  n++;
  return {
    id: `s${n}`,
    start: { raw: start, rounded: start },
    end: end === null ? null : { raw: end, rounded: end },
    breaks: breaks.map(([bs, be], i) => ({
      id: `s${n}b${i}`,
      start: { raw: bs, rounded: bs },
      end: be === null ? null : { raw: be, rounded: be },
    })),
    note: '',
    source: 'punch',
    createdAt: start,
    updatedAt: start,
    ...extra,
  };
}
