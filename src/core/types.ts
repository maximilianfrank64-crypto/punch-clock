/**
 * Domain types. All timestamps are epoch milliseconds (UTC instants).
 * They are only converted to local wall-clock time for rounding and display.
 */

export type PunchEventType = 'in' | 'out' | 'breakStart' | 'breakEnd';

export type RoundingMode = 'off' | 'nearest' | 'up' | 'down';

export interface RoundingRule {
  mode: RoundingMode;
  /** Interval in minutes (1..1440). */
  interval: number;
}

export type RoundingRules = Record<PunchEventType, RoundingRule>;

/** A punch moment. `raw` is what the clock said, `rounded` is after applying the rounding rule. */
export interface Stamp {
  raw: number;
  rounded: number;
}

export interface Break {
  id: string;
  start: Stamp;
  /** null while the break is running. */
  end: Stamp | null;
}

export interface Shift {
  id: string;
  start: Stamp;
  /** null while the shift is running (the "active session"). */
  end: Stamp | null;
  breaks: Break[];
  note: string;
  source: 'punch' | 'manual';
  createdAt: number;
  updatedAt: number;
}

export type PunchStatus = 'off' | 'working' | 'break';

export type TimeFormat = '24h' | '12h';
export type Language = 'en' | 'de';
export type Theme = 'system' | 'light' | 'dark';
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json' | 'txt' | 'html';
export type RangePreset =
  'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom';
export type DurationStyle = 'hm' | 'decimal';

export interface AutoBreakSettings {
  enabled: boolean;
  /** Minimum total break in minutes ... */
  minutes: number;
  /** ... once the shift is longer than this many hours. */
  afterHours: number;
}

export interface TargetSettings {
  dailyEnabled: boolean;
  dailyHours: number;
  weeklyEnabled: boolean;
  weeklyHours: number;
  /** Days of week on which the daily target applies (0 = Sunday). */
  workdays: WeekDay[];
}

export interface RateSettings {
  enabled: boolean;
  hourlyRate: number;
  /** ISO 4217 code, e.g. EUR, USD. */
  currency: string;
  /**
   * Flat percentage for taxes and social contributions (0–100), used to estimate
   * earnings after tax. 0 = don't show. Deliberately simple: users enter their own rate.
   */
  taxPercent: number;
}

export interface Settings {
  rounding: RoundingRules;
  /** Reports normally use rounded times; true shows raw clock times instead. */
  useRawInReports: boolean;
  timeFormat: TimeFormat;
  weekStartsOn: WeekDay;
  language: Language;
  theme: Theme;
  durationStyle: DurationStyle;
  autoBreak: AutoBreakSettings;
  targets: TargetSettings;
  rate: RateSettings;
  exportFormat: ExportFormat;
  exportRange: RangePreset;
  /** Days between backup reminders; 0 disables the reminder. */
  backupReminderDays: number;
}

export interface DateRange {
  /** Inclusive local day keys, yyyy-MM-dd. */
  from: string;
  to: string;
}

/** Optional free-text note for a whole calendar day. */
export interface DayNote {
  /** Local day key, yyyy-MM-dd. */
  date: string;
  text: string;
  updatedAt: number;
}
