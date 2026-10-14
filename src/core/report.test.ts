import { describe, expect, it } from 'vitest';
import { HOUR, MIN, at, plainSettings, shift } from '../test/helpers';
import { presetRange, weekNumber } from './periods';
import { buildReport } from './report';

const NOW = at(2026, 10, 16, 20); // Friday

// Week of Mon 2026-10-12: Mon 8h, Tue 8h30 (30 min break), Wed 6h, plus a night shift Thu→Fri.
const data = [
  shift(at(2026, 10, 12, 8), at(2026, 10, 12, 16)),
  shift(at(2026, 10, 13, 8), at(2026, 10, 13, 17), [
    [at(2026, 10, 13, 12), at(2026, 10, 13, 12, 30)],
  ]),
  shift(at(2026, 10, 14, 9), at(2026, 10, 14, 15)),
  shift(at(2026, 10, 15, 22), at(2026, 10, 16, 2)),
  // previous month
  shift(at(2026, 9, 30, 8), at(2026, 9, 30, 12)),
];

describe('buildReport', () => {
  it('groups by day, week and month with totals', () => {
    const r = buildReport(data, { from: '2026-10-12', to: '2026-10-18' }, plainSettings(), NOW);
    expect(r.days).toHaveLength(7);
    expect(r.listedDays.map((d) => d.date)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
    ]);
    expect(r.listedDays[1]!.netMs).toBe(8.5 * HOUR);
    expect(r.listedDays[1]!.breakMs).toBe(30 * MIN);
    // the night shift counts for the day it started
    expect(r.listedDays[3]!.netMs).toBe(4 * HOUR);
    expect(r.total.netMs).toBe((8 + 8.5 + 6 + 4) * HOUR);
    expect(r.total.shiftCount).toBe(4);
    expect(r.weeks).toHaveLength(1);
    expect(r.months).toHaveLength(1);
    expect(r.total.targetMs).toBeNull();
    expect(r.total.earnings).toBeNull();
  });

  it('splits weeks and months across a month boundary', () => {
    const r = buildReport(data, { from: '2026-09-28', to: '2026-10-18' }, plainSettings(), NOW);
    expect(r.months.map((m) => m.key)).toEqual(['2026-09', '2026-10']);
    expect(r.months[0]!.netMs).toBe(4 * HOUR);
    expect(r.weeks).toHaveLength(3);
    // ISO week 41 starts Monday 2026-10-05
    expect(r.weeks.map((w) => w.week)).toEqual([40, 41, 42]);
  });

  it('daily target counts workdays up to today; overtime = net - target', () => {
    const settings = plainSettings({
      targets: {
        dailyEnabled: true,
        dailyHours: 8,
        weeklyEnabled: false,
        weeklyHours: 40,
        workdays: [1, 2, 3, 4, 5],
      },
    });
    const r = buildReport(data, { from: '2026-10-12', to: '2026-10-18' }, settings, NOW);
    // Mon..Fri are all <= today (Fri) → 5 × 8h
    expect(r.total.targetMs).toBe(40 * HOUR);
    expect(r.total.overtimeMs).toBe((26.5 - 40) * HOUR);
    expect(r.days.find((d) => d.date === '2026-10-17')!.targetMs).toBe(0); // Saturday
  });

  it('weekly target is prorated for partial weeks in the range', () => {
    const settings = plainSettings({
      targets: {
        dailyEnabled: false,
        dailyHours: 8,
        weeklyEnabled: true,
        weeklyHours: 40,
        workdays: [1, 2, 3, 4, 5],
      },
    });
    // Only Mon–Wed of the week → 3/5 of 40h
    const r = buildReport(data, { from: '2026-10-12', to: '2026-10-14' }, settings, NOW);
    expect(r.weeks[0]!.targetMs).toBe(24 * HOUR);
    expect(r.total.targetMs).toBe(24 * HOUR);
    expect(r.months[0]!.targetMs).toBe(24 * HOUR);
  });

  it('earnings use the hourly rate', () => {
    const settings = plainSettings({
      rate: { enabled: true, hourlyRate: 20, currency: 'EUR', taxPercent: 0 },
    });
    const r = buildReport(data, { from: '2026-10-12', to: '2026-10-18' }, settings, NOW);
    expect(r.total.earnings).toBe(26.5 * 20);
    expect(r.currency).toBe('EUR');
  });

  it('estimates earnings after tax with a flat rate', () => {
    const rate = { enabled: true, hourlyRate: 20, currency: 'EUR', taxPercent: 30 };
    const r = buildReport(
      data,
      { from: '2026-10-12', to: '2026-10-18' },
      plainSettings({ rate }),
      NOW,
    );
    expect(r.total.earnings).toBe(530);
    expect(r.total.earningsAfterTax).toBe(371);
    expect(r.taxPercent).toBe(30);
    // Tuesday: 8.5 h × 20 = 170 → 119 after 30 %
    expect(r.days.find((d) => d.date === '2026-10-13')!.earningsAfterTax).toBe(119);

    const noTax = buildReport(
      data,
      { from: '2026-10-12', to: '2026-10-18' },
      plainSettings({ rate: { ...rate, taxPercent: 0 } }),
      NOW,
    );
    expect(noTax.total.earningsAfterTax).toBeNull();
    expect(noTax.taxPercent).toBeNull();
  });

  it('uses raw or rounded times per setting', () => {
    const s = shift(at(2026, 10, 12, 8), at(2026, 10, 12, 16));
    s.start = { raw: at(2026, 10, 12, 7, 53), rounded: at(2026, 10, 12, 8) };
    const range = { from: '2026-10-12', to: '2026-10-12' };
    expect(buildReport([s], range, plainSettings(), NOW).total.netMs).toBe(8 * HOUR);
    expect(buildReport([s], range, plainSettings({ useRawInReports: true }), NOW).total.netMs).toBe(
      8 * HOUR + 7 * MIN,
    );
  });

  it('lists days that only have a day note, without changing totals', () => {
    const r = buildReport(data, { from: '2026-10-12', to: '2026-10-18' }, plainSettings(), NOW, {
      '2026-10-17': { text: '  Weekend trip  ' },
      '2026-10-12': { text: 'Kickoff' },
    });
    expect(r.listedDays.map((d) => [d.date, d.note])).toEqual([
      ['2026-10-12', 'Kickoff'],
      ['2026-10-13', ''],
      ['2026-10-14', ''],
      ['2026-10-15', ''],
      ['2026-10-17', 'Weekend trip'],
    ]);
    expect(r.total.netMs).toBe((8 + 8.5 + 6 + 4) * HOUR);
    expect(r.total.shiftCount).toBe(4);
  });

  it('includes a running shift up to now', () => {
    const running = shift(at(2026, 10, 16, 18), null);
    const r = buildReport(
      [running],
      { from: '2026-10-16', to: '2026-10-16' },
      plainSettings(),
      NOW,
    );
    expect(r.total.netMs).toBe(2 * HOUR);
    expect(r.listedDays[0]!.shifts[0]!.end).toBeNull();
  });

  it('handles the 25-hour DST day', () => {
    const night = shift(at(2026, 10, 24, 22), at(2026, 10, 25, 6));
    const r = buildReport([night], { from: '2026-10-24', to: '2026-10-25' }, plainSettings(), NOW);
    expect(r.total.netMs).toBe(9 * HOUR);
  });
});

describe('periods', () => {
  it('preset ranges respect week start', () => {
    expect(presetRange('thisWeek', NOW, 1)).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    expect(presetRange('thisWeek', NOW, 0)).toEqual({ from: '2026-10-11', to: '2026-10-17' });
    expect(presetRange('lastMonth', NOW, 1)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetRange('thisYear', NOW, 1)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
  it('ISO week numbers for Monday start', () => {
    expect(weekNumber(at(2026, 1, 1), 1)).toBe(1);
    expect(weekNumber(at(2026, 10, 14), 1)).toBe(42);
  });
});
