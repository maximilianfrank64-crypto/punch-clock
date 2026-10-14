import { useEffect, useId, useRef, useState } from 'react';
import { formatDateLong } from '../../core/format';
import { useApp } from '../../store/appStore';
import { Dialog } from '../../ui/components';
import { useSettings, useT } from '../../ui/hooks';

/**
 * Inline day note (home screen). Saves when the field loses focus, so typing
 * never writes on every keystroke; an empty field removes the note.
 */
export function DayNoteField({ date, label }: { date: string; label: string }) {
  const t = useT();
  const id = useId();
  const stored = useApp((s) => s.dayNotes[date]?.text ?? '');
  const setDayNote = useApp((s) => s.setDayNote);
  const [text, setText] = useState(stored);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // Follow external changes (other day after midnight, restore, edit in History).
  useEffect(() => setText(stored), [stored, date]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = async () => {
    if (text.trim() === stored) return;
    await setDayNote(date, text);
    setSaved(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="field day-note-field">
      <label htmlFor={id}>
        {label}
        {saved && (
          <span className="saved" role="status">
            {' '}
            · {t('daynote.saved')}
          </span>
        )}
      </label>
      <textarea
        id={id}
        rows={2}
        value={text}
        placeholder={t('daynote.placeholder')}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => void save()}
      />
    </div>
  );
}

/** Dialog to add, edit or (by clearing) remove the note of any day. */
export function DayNoteDialog({ date, onClose }: { date: string | null; onClose: () => void }) {
  const t = useT();
  const settings = useSettings();
  const stored = useApp((s) => (date ? (s.dayNotes[date]?.text ?? '') : ''));
  const setDayNote = useApp((s) => s.setDayNote);
  const [text, setText] = useState('');

  useEffect(() => {
    if (date) setText(stored);
  }, [date, stored]);

  const save = async () => {
    if (date) await setDayNote(date, text);
    onClose();
  };

  return (
    <Dialog
      open={date !== null}
      onClose={onClose}
      title={date ? t('daynote.forDay', { date: formatDateLong(date, settings.language) }) : ''}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="day-note-dialog">{t('daynote.label')}</label>
        <textarea
          id="day-note-dialog"
          rows={4}
          value={text}
          placeholder={t('daynote.placeholder')}
          onChange={(e) => setText(e.target.value)}
        />
        <small className="muted">{t('daynote.hint')}</small>
      </div>
    </Dialog>
  );
}
