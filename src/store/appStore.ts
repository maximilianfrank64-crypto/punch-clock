import { create } from 'zustand';
import { mergeShifts } from '../core/backup';
import * as punch from '../core/punch';
import { defaultSettings, detectLanguage, sanitizeSettings } from '../core/settings';
import type { Settings, Shift } from '../core/types';
import * as repo from '../db/db';
import type { Meta } from '../db/db';

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error';
}

interface AppState {
  ready: boolean;
  loadError: string | null;
  shifts: Shift[];
  settings: Settings;
  meta: Meta;
  toasts: Toast[];

  init: () => Promise<void>;
  punchIn: () => Promise<void>;
  punchOut: () => Promise<void>;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;
  saveShift: (shift: Shift) => Promise<void>;
  removeShift: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  restore: (
    shifts: Shift[],
    settings: Settings | null,
    mode: 'merge' | 'replace',
  ) => Promise<number>;
  updateMeta: (patch: Partial<Meta>) => Promise<void>;
  deleteEverything: () => Promise<void>;
  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

const browserLanguage = () =>
  detectLanguage(typeof navigator === 'undefined' ? undefined : navigator.languages);

const sortShifts = (shifts: Shift[]) => [...shifts].sort((a, b) => a.start.raw - b.start.raw);

export const selectActive = (s: Pick<AppState, 'shifts'>): Shift | undefined =>
  s.shifts.find((x) => x.end === null);

let toastId = 0;

export const useApp = create<AppState>()((set, get) => {
  /** Apply a punch transition: compute, persist immediately, then publish. */
  const transition = async (fn: (active: Shift | undefined, now: number) => Shift) => {
    const next = fn(selectActive(get()), Date.now());
    await repo.putShift(next);
    set((s) => ({ shifts: sortShifts([...s.shifts.filter((x) => x.id !== next.id), next]) }));
  };

  const guard =
    <A extends unknown[]>(fn: (...a: A) => Promise<void>) =>
    async (...a: A) => {
      try {
        await fn(...a);
      } catch (e) {
        // A PunchError means the state already changed (e.g. a double tap): nothing to report.
        if (e instanceof punch.PunchError) return;
        get().toast(e instanceof Error ? e.message : String(e), 'error');
      }
    };

  return {
    ready: false,
    loadError: null,
    shifts: [],
    settings: defaultSettings(browserLanguage()),
    meta: repo.defaultMeta(),
    toasts: [],

    init: async () => {
      try {
        const data = await repo.loadAll();
        const settings = sanitizeSettings(data.settings, defaultSettings(browserLanguage()));
        set({ ready: true, shifts: sortShifts(data.shifts), settings, meta: data.meta });
      } catch (e) {
        // e.g. IndexedDB blocked in a private window: show the app, report the problem.
        set({ ready: true, loadError: e instanceof Error ? e.message : String(e) });
      }
    },

    punchIn: guard(() => transition((a, now) => punch.punchIn(a, now, get().settings.rounding))),
    punchOut: guard(() => transition((a, now) => punch.punchOut(a, now, get().settings.rounding))),
    startBreak: guard(() =>
      transition((a, now) => punch.startBreak(a, now, get().settings.rounding)),
    ),
    endBreak: guard(() => transition((a, now) => punch.endBreak(a, now, get().settings.rounding))),

    saveShift: guard(async (shift) => {
      const next = punch.normalizeShift({ ...shift, updatedAt: Date.now() });
      await repo.putShift(next);
      set((s) => ({ shifts: sortShifts([...s.shifts.filter((x) => x.id !== next.id), next]) }));
    }),

    removeShift: guard(async (id) => {
      await repo.deleteShift(id);
      set((s) => ({ shifts: s.shifts.filter((x) => x.id !== id) }));
    }),

    updateSettings: guard(async (patch) => {
      const settings = sanitizeSettings({ ...get().settings, ...patch }, get().settings);
      await repo.saveSettings(settings);
      set({ settings });
    }),

    restore: async (incoming, settings, mode) => {
      const shifts = mode === 'replace' ? incoming : mergeShifts(get().shifts, incoming);
      const nextSettings = mode === 'replace' && settings ? settings : get().settings;
      await repo.replaceAll(shifts, nextSettings);
      set({ shifts: sortShifts(shifts), settings: nextSettings });
      return incoming.length;
    },

    updateMeta: async (patch) => {
      const meta = { ...get().meta, ...patch };
      await repo.saveMeta(meta);
      set({ meta });
    },

    deleteEverything: guard(async () => {
      await repo.clearAll();
      set({
        shifts: [],
        settings: defaultSettings(get().settings.language),
        meta: repo.defaultMeta(),
      });
    }),

    toast: (message, kind = 'info') => {
      const id = ++toastId;
      set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
      setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3500);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});
