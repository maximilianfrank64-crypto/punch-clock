import Dexie, { type Table } from 'dexie';
import type { Settings, Shift } from '../core/types';

export interface KV {
  key: string;
  value: unknown;
}

export interface Meta {
  lastBackupAt: number | null;
  backupReminderDismissedAt: number | null;
}

/**
 * IndexedDB schema.
 *  - shifts: one row per shift; the active session is the row with end === null.
 *  - kv: settings and small app metadata.
 * Bump the version and add an upgrade() when changing indexes.
 */
class PunchDB extends Dexie {
  shifts!: Table<Shift, string>;
  kv!: Table<KV, string>;

  constructor(name = 'punch-clock') {
    super(name);
    this.version(1).stores({
      shifts: 'id, start.raw, updatedAt',
      kv: 'key',
    });
  }
}

export const db = new PunchDB();

const SETTINGS_KEY = 'settings';
const META_KEY = 'meta';

export const defaultMeta = (): Meta => ({ lastBackupAt: null, backupReminderDismissedAt: null });

export async function loadAll(): Promise<{ shifts: Shift[]; settings: unknown; meta: Meta }> {
  return db.transaction('r', db.shifts, db.kv, async () => {
    const [shifts, settings, meta] = await Promise.all([
      db.shifts.orderBy('start.raw').toArray(),
      db.kv.get(SETTINGS_KEY),
      db.kv.get(META_KEY),
    ]);
    return {
      shifts,
      settings: settings?.value,
      meta: { ...defaultMeta(), ...((meta?.value as Partial<Meta> | undefined) ?? {}) },
    };
  });
}

export const putShift = (shift: Shift) => db.shifts.put(shift);
export const deleteShift = (id: string) => db.shifts.delete(id);
export const saveSettings = (settings: Settings) =>
  db.kv.put({ key: SETTINGS_KEY, value: settings });
export const saveMeta = (meta: Meta) => db.kv.put({ key: META_KEY, value: meta });

/** Atomically replace all shifts (and optionally settings), e.g. on restore. */
export async function replaceAll(shifts: Shift[], settings?: Settings): Promise<void> {
  await db.transaction('rw', db.shifts, db.kv, async () => {
    await db.shifts.clear();
    await db.shifts.bulkPut(shifts);
    if (settings) await db.kv.put({ key: SETTINGS_KEY, value: settings });
  });
}

export async function clearAll(): Promise<void> {
  await db.transaction('rw', db.shifts, db.kv, async () => {
    await db.shifts.clear();
    await db.kv.clear();
  });
}
