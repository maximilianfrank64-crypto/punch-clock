import { useId, useState } from 'react';
import { formatTime } from '../../core/format';
import { roundTime } from '../../core/rounding';
import { MAX_INTERVAL, MIN_INTERVAL, PRESET_INTERVALS, ROUNDING_MODES } from '../../core/settings';
import type { PunchEventType, RoundingRule, TimeFormat } from '../../core/types';
import { useT } from '../../ui/hooks';

const EXAMPLE_TIMES: Record<PunchEventType, [number, number]> = {
  in: [7, 47],
  out: [15, 55],
  breakStart: [12, 3],
  breakEnd: [12, 34],
};

export function RoundingRuleEditor({
  type,
  rule,
  timeFormat,
  onChange,
}: {
  type: PunchEventType;
  rule: RoundingRule;
  timeFormat: TimeFormat;
  onChange: (rule: RoundingRule) => void;
}) {
  const t = useT();
  const id = useId();
  const isPreset = (PRESET_INTERVALS as readonly number[]).includes(rule.interval);
  const [custom, setCustom] = useState(!isPreset);
  const [customText, setCustomText] = useState(String(rule.interval));

  const [h, m] = EXAMPLE_TIMES[type];
  const sample = new Date(2026, 0, 15, h, m).getTime();
  const example =
    rule.mode === 'off'
      ? null
      : t('settings.example', {
          from: formatTime(sample, timeFormat),
          to: formatTime(roundTime(sample, rule), timeFormat),
        });

  const commitCustom = () => {
    const n = Math.round(Number(customText));
    if (Number.isFinite(n) && n >= MIN_INTERVAL && n <= MAX_INTERVAL)
      onChange({ ...rule, interval: n });
    else setCustomText(String(rule.interval));
  };

  return (
    <fieldset className="rule">
      <legend>{t(`settings.rule.${type}`)}</legend>
      <div className="rule-grid">
        <div className="field">
          <label htmlFor={`${id}-mode`}>{t('settings.mode')}</label>
          <select
            id={`${id}-mode`}
            value={rule.mode}
            onChange={(e) => onChange({ ...rule, mode: e.target.value as RoundingRule['mode'] })}
          >
            {ROUNDING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`settings.mode.${mode}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-int`}>{t('settings.interval')}</label>
          <select
            id={`${id}-int`}
            value={custom ? 'custom' : String(rule.interval)}
            disabled={rule.mode === 'off'}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setCustom(true);
                setCustomText(String(rule.interval));
              } else {
                setCustom(false);
                onChange({ ...rule, interval: Number(e.target.value) });
              }
            }}
          >
            {PRESET_INTERVALS.map((n) => (
              <option key={n} value={n}>
                {t('settings.intervalMin', { n })}
              </option>
            ))}
            <option value="custom">{t('settings.intervalCustom')}</option>
          </select>
        </div>
      </div>
      {custom && rule.mode !== 'off' && (
        <div className="field">
          <label htmlFor={`${id}-custom`}>{t('settings.intervalCustomLabel')}</label>
          <input
            id={`${id}-custom`}
            type="number"
            inputMode="numeric"
            min={MIN_INTERVAL}
            max={MAX_INTERVAL}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={(e) => e.key === 'Enter' && commitCustom()}
          />
        </div>
      )}
      {example && <p className="muted small rule-example">{example}</p>}
    </fieldset>
  );
}
