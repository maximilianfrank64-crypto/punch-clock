import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getStatus } from '../core/punch';
import { db, loadAll } from '../db/db';
import { selectActive, useApp } from './appStore';

describe('app store persistence', () => {
  beforeEach(async () => {
    await db.shifts.clear();
    await db.kv.clear();
    await db.dayNotes.clear();
    await useApp.getState().init();
  });

  it('persists the active session immediately on every punch', async () => {
    await useApp.getState().punchIn();
    let stored = await loadAll();
    expect(stored.shifts).toHaveLength(1);
    expect(stored.shifts[0]!.end).toBeNull();

    await useApp.getState().startBreak();
    stored = await loadAll();
    expect(getStatus(stored.shifts[0])).toBe('break');

    // Simulate an app restart: reload state from IndexedDB.
    useApp.setState({ shifts: [] });
    await useApp.getState().init();
    expect(getStatus(selectActive(useApp.getState()))).toBe('break');

    await useApp.getState().punchOut();
    stored = await loadAll();
    expect(getStatus(stored.shifts[0])).toBe('off');
    expect(stored.shifts[0]!.breaks[0]!.end).not.toBeNull();
  });

  it('day notes are saved, trimmed, survive a restart, and empty text removes them', async () => {
    await useApp.getState().setDayNote('2026-10-14', '  Release day  ');
    expect((await loadAll()).dayNotes).toEqual([
      expect.objectContaining({ date: '2026-10-14', text: 'Release day' }),
    ]);
    useApp.setState({ dayNotes: {} });
    await useApp.getState().init();
    expect(useApp.getState().dayNotes['2026-10-14']?.text).toBe('Release day');

    await useApp.getState().setDayNote('2026-10-14', '   ');
    expect((await loadAll()).dayNotes).toHaveLength(0);
    expect(useApp.getState().dayNotes['2026-10-14']).toBeUndefined();
  });

  it('double punch-in is ignored, not duplicated', async () => {
    await useApp.getState().punchIn();
    await useApp.getState().punchIn();
    expect((await loadAll()).shifts).toHaveLength(1);
  });

  it('settings round-trip through IndexedDB', async () => {
    await useApp.getState().updateSettings({ timeFormat: '24h', language: 'de' });
    useApp.setState({ ready: false });
    await useApp.getState().init();
    expect(useApp.getState().settings.timeFormat).toBe('24h');
    expect(useApp.getState().settings.language).toBe('de');
  });

  it('delete everything clears the database', async () => {
    await useApp.getState().punchIn();
    await useApp.getState().deleteEverything();
    expect((await loadAll()).shifts).toHaveLength(0);
    expect(useApp.getState().shifts).toHaveLength(0);
  });
});
