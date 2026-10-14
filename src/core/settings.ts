import type {
  DurationStyle,
  ExportFormat,
  Language,
  RangePreset,
  RoundingMode,
  RoundingRule,
  Settings,
  Theme,
  TimeFormat,
  WeekDay,
} from './types';

export const PRESET_INTERVALS = [1, 5, 6, 10, 15, 30, 60] as const;
export const MIN_INTERVAL = 1;
export const MAX_INTERVAL = 1440;

export const ROUNDING_MODES: readonly RoundingMode[] = ['off', 'nearest', 'up', 'down'];
export const EXPORT_FORMATS: readonly ExportFormat[] = [
  'csv',
  'xlsx',
  'pdf',
  'json',
  'txt',
  'html',
];
export const RANGE_PRESETS: readonly RangePreset[] = [
  'today',
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'lastMonth',
  'thisYear',
  'all',
  'custom',
];

export function defaultSettings(language: Language = 'en'): Settings {
  return {
    rounding: {
      in: { mode: 'nearest', interval: 15 },
      out: { mode: 'nearest', interval: 15 },
      breakStart: { mode: 'off', interval: 5 },
      breakEnd: { mode: 'off', interval: 5 },
    },
    useRawInReports: false,
    timeFormat: language === 'de' ? '24h' : '12h',
    weekStartsOn: language === 'de' ? 1 : 0,
    language,
    theme: 'system',
    durationStyle: 'hm',
    autoBreak: { enabled: false, minutes: 30, afterHours: 6 },
    targets: {
      dailyEnabled: false,
      dailyHours: 8,
      weeklyEnabled: false,
      weeklyHours: 40,
      workdays: [1, 2, 3, 4, 5],
    },
    rate: {
      enabled: false,
      hourlyRate: 0,
      currency: language === 'de' ? 'EUR' : 'USD',
      taxPercent: 0,
    },
    exportFormat: 'csv',
    exportRange: 'thisMonth',
    backupReminderDays: 30,
  };
}

/** Guess the UI language from the browser, falling back to English. */
export function detectLanguage(navigatorLanguages: readonly string[] | undefined): Language {
  for (const lang of navigatorLanguages ?? []) {
    const base = lang.toLowerCase().split('-')[0];
    if (base === 'de') return 'de';
    if (base === 'en') return 'en';
  }
  return 'en';
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export function sanitizeRule(v: unknown, fallback: RoundingRule): RoundingRule {
  if (!isObj(v)) return fallback;
  return {
    mode: pick(v.mode, ROUNDING_MODES, fallback.mode),
    // Below the minimum is meaningless → default; above the maximum → clamp.
    interval:
      typeof v.interval === 'number' && v.interval >= MIN_INTERVAL
        ? Math.round(Math.min(MAX_INTERVAL, v.interval))
        : fallback.interval,
  };
}

/**
 * Merge stored/imported settings onto the defaults, dropping anything invalid.
 * Keeps old saved data working when new settings are added in later versions.
 */
export function sanitizeSettings(input: unknown, base: Settings = defaultSettings()): Settings {
  if (!isObj(input)) return base;
  const r = isObj(input.rounding) ? input.rounding : {};
  const ab = isObj(input.autoBreak) ? input.autoBreak : {};
  const tg = isObj(input.targets) ? input.targets : {};
  const rt = isObj(input.rate) ? input.rate : {};
  const weekDays: readonly WeekDay[] = [0, 1, 2, 3, 4, 5, 6];
  const workdays = Array.isArray(tg.workdays)
    ? [...new Set(tg.workdays.filter((d): d is WeekDay => weekDays.includes(d as WeekDay)))].sort()
    : base.targets.workdays;

  return {
    rounding: {
      in: sanitizeRule(r.in, base.rounding.in),
      out: sanitizeRule(r.out, base.rounding.out),
      breakStart: sanitizeRule(r.breakStart, base.rounding.breakStart),
      breakEnd: sanitizeRule(r.breakEnd, base.rounding.breakEnd),
    },
    useRawInReports: bool(input.useRawInReports, base.useRawInReports),
    timeFormat: pick<TimeFormat>(input.timeFormat, ['24h', '12h'], base.timeFormat),
    weekStartsOn: weekDays.includes(input.weekStartsOn as WeekDay)
      ? (input.weekStartsOn as WeekDay)
      : base.weekStartsOn,
    language: pick<Language>(input.language, ['en', 'de'], base.language),
    theme: pick<Theme>(input.theme, ['system', 'light', 'dark'], base.theme),
    durationStyle: pick<DurationStyle>(input.durationStyle, ['hm', 'decimal'], base.durationStyle),
    autoBreak: {
      enabled: bool(ab.enabled, base.autoBreak.enabled),
      minutes: num(ab.minutes, base.autoBreak.minutes, 0, 600),
      afterHours: num(ab.afterHours, base.autoBreak.afterHours, 0, 24),
    },
    targets: {
      dailyEnabled: bool(tg.dailyEnabled, base.targets.dailyEnabled),
      dailyHours: num(tg.dailyHours, base.targets.dailyHours, 0, 24),
      weeklyEnabled: bool(tg.weeklyEnabled, base.targets.weeklyEnabled),
      weeklyHours: num(tg.weeklyHours, base.targets.weeklyHours, 0, 168),
      workdays,
    },
    rate: {
      enabled: bool(rt.enabled, base.rate.enabled),
      hourlyRate: num(rt.hourlyRate, base.rate.hourlyRate, 0, 1_000_000),
      currency:
        typeof rt.currency === 'string' && /^[A-Z]{3}$/.test(rt.currency)
          ? rt.currency
          : base.rate.currency,
      taxPercent: num(rt.taxPercent, base.rate.taxPercent, 0, 100),
    },
    exportFormat: pick(input.exportFormat, EXPORT_FORMATS, base.exportFormat),
    exportRange: pick(input.exportRange, RANGE_PRESETS, base.exportRange),
    backupReminderDays: Math.round(num(input.backupReminderDays, base.backupReminderDays, 0, 365)),
  };
}
