import { calcShift, type Interval } from './calc';
import { dayEnd, dayKey, dayKeysInRange, dayStart, monthKey, weekKey, weekNumber } from './periods';
import { stampTime } from './rounding';
import type { DateRange, Settings, Shift, WeekDay } from './types';

const HOUR = 3_600_000;

export interface ShiftRow {
  id: string;
  start: number;
  /** null when the shift is still running. */
  end: number | null;
  breaks: Interval[];
  breakMs: number;
  autoBreakMs: number;
  netMs: number;
  note: string;
  /** Raw times, kept for transparency (e.g. "rounded from 07:47"). */
  rawStart: number;
  rawEnd: number | null;
}

export interface Totals {
  netMs: number;
  breakMs: number;
  grossMs: number;
  shiftCount: number;
  /** Target for this period; null when no target applies. */
  targetMs: number | null;
  /** netMs - targetMs; null when no target applies. */
  overtimeMs: number | null;
  /** Earnings in currency units; null when the hourly rate is disabled. */
  earnings: number | null;
}

export interface DayReport extends Totals {
  date: string;
  shifts: ShiftRow[];
  /** Optional free-text note for the whole day ('' if none). */
  note: string;
}

export interface PeriodReport extends Totals {
  /** Week: first day of week (yyyy-MM-dd). Month: yyyy-MM. */
  key: string;
  /** Week number (weeks only). */
  week?: number;
  from: string;
  to: string;
}

export interface Report {
  range: DateRange;
  generatedAt: number;
  useRaw: boolean;
  currency: string | null;
  days: DayReport[];
  /** Days that have shifts or a day note (for listings and exports). */
  listedDays: DayReport[];
  weeks: PeriodReport[];
  months: PeriodReport[];
  total: Totals;
}

/** A shift belongs to the local day on which it starts. */
export function shiftDayKey(shift: Shift, useRaw: boolean): string {
  return dayKey(stampTime(shift.start, useRaw));
}

export function shiftsInRange(shifts: Shift[], range: DateRange, useRaw: boolean): Shift[] {
  const from = dayStart(range.from);
  const to = dayEnd(range.to);
  return shifts
    .filter((s) => {
      const t = stampTime(s.start, useRaw);
      return t >= from && t < to;
    })
    .sort((a, b) => stampTime(a.start, useRaw) - stampTime(b.start, useRaw));
}

function emptyTotals(): Totals {
  return {
    netMs: 0,
    breakMs: 0,
    grossMs: 0,
    shiftCount: 0,
    targetMs: null,
    overtimeMs: null,
    earnings: null,
  };
}

function addInto(into: Totals, t: Totals) {
  into.netMs += t.netMs;
  into.breakMs += t.breakMs;
  into.grossMs += t.grossMs;
  into.shiftCount += t.shiftCount;
  if (t.targetMs !== null) into.targetMs = (into.targetMs ?? 0) + t.targetMs;
  if (t.earnings !== null) into.earnings = (into.earnings ?? 0) + t.earnings;
}

function finish(t: Totals): Totals {
  t.overtimeMs = t.targetMs === null ? null : t.netMs - t.targetMs;
  return t;
}

const earningsFor = (netMs: number, settings: Settings) =>
  settings.rate.enabled ? Math.round((netMs / HOUR) * settings.rate.hourlyRate * 100) / 100 : null;

/**
 * Daily target applies to configured workdays up to and including today
 * (future days don't count as missing hours yet).
 */
function dailyTarget(key: string, settings: Settings, todayKey: string): number | null {
  if (!settings.targets.dailyEnabled) return null;
  if (key > todayKey) return 0;
  const dow = new Date(dayStart(key)).getDay() as WeekDay;
  return settings.targets.workdays.includes(dow) ? settings.targets.dailyHours * HOUR : 0;
}

export function buildReport(
  allShifts: Shift[],
  range: DateRange,
  settings: Settings,
  now: number,
  /** Day notes keyed by yyyy-MM-dd. */
  dayNotes: Readonly<Record<string, { text: string }>> = {},
): Report {
  const useRaw = settings.useRawInReports;
  const todayKey = dayKey(now);
  const calcOpts = { useRaw, now, autoBreak: settings.autoBreak };
  const byDay = new Map<string, ShiftRow[]>();

  for (const s of shiftsInRange(allShifts, range, useRaw)) {
    const c = calcShift(s, calcOpts);
    const row: ShiftRow = {
      id: s.id,
      start: c.start,
      end: c.running ? null : c.end,
      breaks: c.breaks,
      breakMs: c.breakMs,
      autoBreakMs: c.autoBreakMs,
      netMs: c.netMs,
      note: s.note,
      rawStart: s.start.raw,
      rawEnd: s.end ? s.end.raw : null,
    };
    const key = dayKey(c.start);
    const list = byDay.get(key) ?? [];
    list.push(row);
    byDay.set(key, list);
  }

  const days: DayReport[] = dayKeysInRange(range).map((date) => {
    const shifts = byDay.get(date) ?? [];
    const t = emptyTotals();
    for (const r of shifts) {
      const end = r.end ?? now;
      t.netMs += r.netMs;
      t.breakMs += r.breakMs;
      t.grossMs += Math.max(0, end - r.start);
      t.shiftCount += 1;
    }
    t.targetMs = dailyTarget(date, settings, todayKey);
    t.earnings = earningsFor(t.netMs, settings);
    return { date, shifts, note: dayNotes[date]?.text.trim() ?? '', ...finish(t) };
  });

  const weeks = groupPeriods(days, (d) => weekKey(dayStart(d.date), settings.weekStartsOn));
  for (const w of weeks) {
    w.week = weekNumber(dayStart(w.key), settings.weekStartsOn);
    if (settings.targets.weeklyEnabled && !settings.targets.dailyEnabled) {
      w.targetMs = weeklyTarget(w, settings, todayKey);
      finish(w);
    }
  }
  const months = groupPeriods(days, (d) => monthKey(dayStart(d.date)));
  if (settings.targets.weeklyEnabled && !settings.targets.dailyEnabled) {
    for (const m of months) {
      m.targetMs = weeks.reduce((sum, w) => sum + overlapTarget(w, m, settings), 0);
      finish(m);
    }
  }
  // Earnings from summed net time (not summed per-day cents) to avoid rounding drift.
  for (const p of [...weeks, ...months]) p.earnings = earningsFor(p.netMs, settings);

  const total = emptyTotals();
  for (const w of weeks) addInto(total, w);
  finish(total);
  if (settings.rate.enabled) total.earnings = earningsFor(total.netMs, settings);

  return {
    range,
    generatedAt: now,
    useRaw,
    currency: settings.rate.enabled ? settings.rate.currency : null,
    days,
    listedDays: days.filter((d) => d.shiftCount > 0 || d.note !== ''),
    weeks,
    months,
    total,
  };
}

function groupPeriods(days: DayReport[], keyOf: (d: DayReport) => string): PeriodReport[] {
  const out: PeriodReport[] = [];
  let cur: PeriodReport | undefined;
  for (const d of days) {
    const key = keyOf(d);
    if (!cur || cur.key !== key) {
      if (cur) finish(cur);
      cur = { key, from: d.date, to: d.date, ...emptyTotals() };
      out.push(cur);
    }
    cur.to = d.date;
    addInto(cur, d);
  }
  if (cur) finish(cur);
  return out;
}

const isWorkday = (key: string, settings: Settings) =>
  settings.targets.workdays.includes(new Date(dayStart(key)).getDay() as WeekDay);

/**
 * Weekly target (used when no daily target is set). A week that is cut off by
 * the report range gets a share proportional to the workdays inside the range;
 * weeks that have not started yet get 0.
 */
function weeklyTarget(w: PeriodReport, settings: Settings, todayKey: string): number {
  if (w.from > todayKey) return 0;
  const perWeek = settings.targets.weeklyHours * HOUR;
  const workdaysPerWeek = settings.targets.workdays.length;
  if (workdaysPerWeek === 0) return perWeek;
  const covered = dayKeysInRange({ from: w.from, to: w.to }).filter((k) =>
    isWorkday(k, settings),
  ).length;
  return (perWeek * covered) / workdaysPerWeek;
}

/** Part of a week's target that falls into a month (split by workdays). */
function overlapTarget(w: PeriodReport, m: PeriodReport, settings: Settings): number {
  const from = w.from > m.from ? w.from : m.from;
  const to = w.to < m.to ? w.to : m.to;
  if (from > to || !w.targetMs) return 0;
  const weekDays = dayKeysInRange({ from: w.from, to: w.to }).filter((k) => isWorkday(k, settings));
  if (weekDays.length === 0) return 0;
  const inMonth = weekDays.filter((k) => k >= from && k <= to).length;
  return (w.targetMs * inMonth) / weekDays.length;
}
