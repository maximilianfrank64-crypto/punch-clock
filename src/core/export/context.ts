import {
  crossesMidnight,
  formatDate,
  formatDuration,
  formatMoney,
  formatMonth,
  formatTime,
  hoursDecimal,
} from '../format';
import type { PeriodReport, Report, Totals } from '../report';
import type { DurationStyle, Language, TimeFormat } from '../types';

/** All user-visible words used in exports, supplied by the i18n layer. */
export interface ExportLabels {
  title: string;
  period: string;
  generated: string;
  date: string;
  weekday: string;
  start: string;
  end: string;
  breaks: string;
  worked: string;
  hoursDecimal: string;
  dayTotal: string;
  note: string;
  week: string;
  month: string;
  total: string;
  target: string;
  overtime: string;
  earnings: string;
  shifts: string;
  weeklyTotals: string;
  monthlyTotals: string;
  entries: string;
  running: string;
  rawTimesNote: string;
  roundedTimesNote: string;
  autoBreakNote: string;
  nextDay: string;
  noData: string;
}

export interface ExportContext {
  lang: Language;
  timeFormat: TimeFormat;
  durationStyle: DurationStyle;
  labels: ExportLabels;
}

export interface FlatRow {
  date: string;
  weekday: string;
  start: string;
  end: string;
  breaks: string;
  worked: string;
  hours: number;
  /** Filled on the last row of each day only. */
  dayTotal: string;
  note: string;
}

export const dur = (ms: number, ctx: ExportContext, signed = false) =>
  formatDuration(ms, ctx.durationStyle, { lang: ctx.lang, signed });

export function weekdayShort(key: string, lang: Language): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short' }).format(
    new Date(y, m - 1, d),
  );
}

/** One row per shift, with the day total on the day's last row. */
export function flatRows(report: Report, ctx: ExportContext): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const day of report.workedDays) {
    day.shifts.forEach((s, i) => {
      const endText =
        s.end === null
          ? ctx.labels.running
          : formatTime(s.end, ctx.timeFormat) +
            (crossesMidnight(s.start, s.end) ? ` ${ctx.labels.nextDay}` : '');
      rows.push({
        date: formatDate(day.date, ctx.lang),
        weekday: weekdayShort(day.date, ctx.lang),
        start: formatTime(s.start, ctx.timeFormat),
        end: endText,
        breaks: dur(s.breakMs, ctx),
        worked: dur(s.netMs, ctx),
        hours: hoursDecimal(s.netMs),
        dayTotal: i === day.shifts.length - 1 ? dur(day.netMs, ctx) : '',
        note: s.note,
      });
    });
  }
  return rows;
}

export function periodLabel(p: PeriodReport, kind: 'week' | 'month', ctx: ExportContext): string {
  if (kind === 'month') return formatMonth(p.key, ctx.lang);
  return `${ctx.labels.week} ${p.week ?? ''} (${formatDate(p.from, ctx.lang)} – ${formatDate(p.to, ctx.lang)})`;
}

/** Totals columns shared by week/month/grand total tables. */
export function totalsCells(t: Totals, report: Report, ctx: ExportContext): string[] {
  const cells = [dur(t.netMs, ctx), dur(t.breakMs, ctx), String(t.shiftCount)];
  if (hasTargets(report)) {
    cells.push(t.targetMs === null ? '' : dur(t.targetMs, ctx));
    cells.push(t.overtimeMs === null ? '' : dur(t.overtimeMs, ctx, true));
  }
  if (report.currency) {
    cells.push(t.earnings === null ? '' : formatMoney(t.earnings, report.currency, ctx.lang));
  }
  return cells;
}

export function totalsHeader(report: Report, ctx: ExportContext): string[] {
  const l = ctx.labels;
  const h = [l.worked, l.breaks, l.shifts];
  if (hasTargets(report)) h.push(l.target, l.overtime);
  if (report.currency) h.push(l.earnings);
  return h;
}

export function hasTargets(report: Report): boolean {
  return report.total.targetMs !== null;
}

export function rangeText(report: Report, ctx: ExportContext): string {
  return `${formatDate(report.range.from, ctx.lang)} – ${formatDate(report.range.to, ctx.lang)}`;
}

export function footnotes(report: Report, ctx: ExportContext): string[] {
  const notes = [report.useRaw ? ctx.labels.rawTimesNote : ctx.labels.roundedTimesNote];
  if (report.workedDays.some((d) => d.shifts.some((s) => s.autoBreakMs > 0))) {
    notes.push(ctx.labels.autoBreakNote);
  }
  return notes;
}

export const entryHeader = (ctx: ExportContext) => {
  const l = ctx.labels;
  return [
    l.date,
    l.weekday,
    l.start,
    l.end,
    l.breaks,
    l.worked,
    l.hoursDecimal,
    l.dayTotal,
    l.note,
  ];
};

export const entryCells = (r: FlatRow) => [
  r.date,
  r.weekday,
  r.start,
  r.end,
  r.breaks,
  r.worked,
  r.hours,
  r.dayTotal,
  r.note,
];

/** File name stem, e.g. timesheet_2026-10-01_2026-10-31 */
export function fileStem(report: Report): string {
  return `timesheet_${report.range.from}_${report.range.to}`;
}
