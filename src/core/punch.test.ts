import { describe, expect, it } from 'vitest';
import { at, hm, plainSettings } from '../test/helpers';
import {
  PunchError,
  endBreak,
  getStatus,
  normalizeShift,
  punchIn,
  punchOut,
  startBreak,
} from './punch';
import { defaultSettings } from './settings';
import type { RoundingRules } from './types';

const rules = defaultSettings().rounding; // in/out nearest 15, breaks off
const plain = plainSettings().rounding;

describe('punch state machine', () => {
  it('off → working → break → working → off', () => {
    expect(getStatus(undefined)).toBe('off');
    let s = punchIn(undefined, at(2026, 10, 14, 7, 47), rules, 'a');
    expect(getStatus(s)).toBe('working');
    expect(hm(s.start.rounded)).toBe('07:45');
    expect(hm(s.start.raw)).toBe('07:47');

    s = startBreak(s, at(2026, 10, 14, 12, 0), rules, 'b1');
    expect(getStatus(s)).toBe('break');
    s = endBreak(s, at(2026, 10, 14, 12, 30), rules);
    expect(getStatus(s)).toBe('working');
    expect(s.breaks).toHaveLength(1);

    s = punchOut(s, at(2026, 10, 14, 15, 55), rules);
    expect(getStatus(s)).toBe('off');
    expect(hm(s.end!.rounded)).toBe('16:00');
    expect(hm(s.end!.raw)).toBe('15:55');
  });

  it('punching out during a break ends the break first', () => {
    let s = punchIn(undefined, at(2026, 10, 14, 8, 0), plain);
    s = startBreak(s, at(2026, 10, 14, 12, 0), plain);
    s = punchOut(s, at(2026, 10, 14, 12, 20), plain);
    expect(getStatus(s)).toBe('off');
    expect(s.breaks[0]!.end!.raw).toBe(at(2026, 10, 14, 12, 20));
    expect(s.end!.raw).toBe(at(2026, 10, 14, 12, 20));
  });

  it('rejects invalid transitions', () => {
    const s = punchIn(undefined, at(2026, 10, 14, 8, 0), plain);
    expect(() => punchIn(s, at(2026, 10, 14, 8, 1), plain)).toThrow(PunchError);
    expect(() => endBreak(s, at(2026, 10, 14, 8, 1), plain)).toThrow(PunchError);
    expect(() => punchOut(undefined, at(2026, 10, 14, 8, 1), plain)).toThrow(PunchError);
    expect(() => startBreak(undefined, at(2026, 10, 14, 8, 1), plain)).toThrow(PunchError);
    const onBreak = startBreak(s, at(2026, 10, 14, 9, 0), plain);
    expect(() => startBreak(onBreak, at(2026, 10, 14, 9, 1), plain)).toThrow(PunchError);
  });

  it('supports several breaks per shift', () => {
    let s = punchIn(undefined, at(2026, 10, 14, 8, 0), plain);
    s = endBreak(startBreak(s, at(2026, 10, 14, 10, 0), plain), at(2026, 10, 14, 10, 15), plain);
    s = endBreak(startBreak(s, at(2026, 10, 14, 12, 0), plain), at(2026, 10, 14, 12, 30), plain);
    expect(s.breaks).toHaveLength(2);
  });
});

describe('rounding that would invert times', () => {
  const upIn: RoundingRules = {
    in: { mode: 'up', interval: 15 },
    out: { mode: 'down', interval: 15 },
    breakStart: { mode: 'off', interval: 1 },
    breakEnd: { mode: 'off', interval: 1 },
  };

  it('clamps rounded end to rounded start (7:50 in ↑8:00, 7:55 out ↓7:45)', () => {
    let s = punchIn(undefined, at(2026, 10, 14, 7, 50), upIn);
    s = punchOut(s, at(2026, 10, 14, 7, 55), upIn);
    expect(hm(s.start.rounded)).toBe('08:00');
    expect(s.end!.rounded).toBe(s.start.rounded);
    // raw values stay as recorded
    expect(hm(s.end!.raw)).toBe('07:55');
  });

  it('clamps breaks into the rounded shift', () => {
    let s = punchIn(undefined, at(2026, 10, 14, 7, 50), upIn); // rounded 8:00
    s = startBreak(s, at(2026, 10, 14, 7, 52), upIn); // before rounded start
    s = endBreak(s, at(2026, 10, 14, 8, 10), upIn);
    expect(s.breaks[0]!.start.rounded).toBe(s.start.rounded);
    expect(s.breaks[0]!.start.raw).toBe(at(2026, 10, 14, 7, 52));
  });

  it('normalizeShift closes a dangling break at the shift end', () => {
    const base = punchIn(undefined, at(2026, 10, 14, 8, 0), plain);
    const withBreak = startBreak(base, at(2026, 10, 14, 12, 0), plain);
    const end = at(2026, 10, 14, 13);
    const n = normalizeShift({ ...withBreak, end: { raw: end, rounded: end } });
    expect(n.breaks[0]!.end!.raw).toBe(end);
  });
});

describe('overnight shifts', () => {
  it('handles a shift across midnight with rounding into the next day', () => {
    let s = punchIn(undefined, at(2026, 10, 14, 22, 3), rules);
    s = punchOut(s, at(2026, 10, 15, 5, 53), rules);
    expect(s.start.rounded).toBe(at(2026, 10, 14, 22, 0));
    expect(s.end!.rounded).toBe(at(2026, 10, 15, 6, 0));
  });
});
