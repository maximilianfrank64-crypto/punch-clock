import { useMemo } from 'react';
import { version } from '../../../package.json';
import { FEEDBACK_FORM_URL, GITHUB_REPO } from '../../config';
import { describeDevice, issueUrl, type FeedbackKind } from '../../core/feedback';
import { Section } from '../../ui/components';
import { useSettings, useT } from '../../ui/hooks';
import { Icon } from '../../ui/icons';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function FeedbackScreen() {
  const t = useT();
  const { language } = useSettings();
  const links = useMemo(() => {
    const ctx = {
      appVersion: version,
      language,
      device: describeDevice(navigator.userAgent, isStandalone()),
    };
    const link = (kind: FeedbackKind) => issueUrl(GITHUB_REPO, kind, ctx);
    return { idea: link('idea'), bug: link('bug') };
  }, [language]);

  return (
    <div className="screen feedback">
      <Section>
        <p>{t('feedback.intro')}</p>
        <div className="feedback-actions">
          <a className="feedback-card" href={links.idea} target="_blank" rel="noopener noreferrer">
            <Icon name="idea" className="feedback-icon" />
            <span>
              <strong>{t('feedback.idea')}</strong>
              <small className="muted">{t('feedback.ideaHint')}</small>
            </span>
            <Icon name="external" width={18} height={18} className="muted" />
          </a>
          <a className="feedback-card" href={links.bug} target="_blank" rel="noopener noreferrer">
            <Icon name="bug" className="feedback-icon" />
            <span>
              <strong>{t('feedback.bug')}</strong>
              <small className="muted">{t('feedback.bugHint')}</small>
            </span>
            <Icon name="external" width={18} height={18} className="muted" />
          </a>
        </div>
      </Section>

      <Section title={t('feedback.howTitle')} id="f-how">
        <p>{t('feedback.how')}</p>
        {FEEDBACK_FORM_URL && (
          <p>
            {t('feedback.noAccount')}{' '}
            <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer">
              {t('feedback.form')}
            </a>
          </p>
        )}
        <p className="muted">{t('feedback.alt')}</p>
        <div className="callout">
          <Icon name="shield" className="callout-icon" />
          <p className="small">{t('feedback.privacy')}</p>
        </div>
      </Section>
    </div>
  );
}
