export type FeedbackKind = 'idea' | 'bug';

export interface FeedbackContext {
  appVersion: string;
  language: string;
  /** Coarse device description, e.g. "iPhone · installed app". No identifiers. */
  device: string;
}

/**
 * Link to a new GitHub issue using the repo's issue form (.github/ISSUE_TEMPLATE),
 * with technical context pre-filled. Never includes any of the user's time data.
 */
export function issueUrl(repo: string, kind: FeedbackKind, ctx: FeedbackContext): string {
  const params = new URLSearchParams({
    template: kind === 'idea' ? 'idea.yml' : 'bug.yml',
    environment: `App ${ctx.appVersion} · ${ctx.language} · ${ctx.device}`,
  });
  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}

/** Coarse, non-identifying device description from the user agent. */
export function describeDevice(userAgent: string, standalone: boolean): string {
  const ua = userAgent.toLowerCase();
  const kind = /iphone/.test(ua)
    ? 'iPhone'
    : /ipad/.test(ua) || (/macintosh/.test(ua) && /mobile/.test(ua))
      ? 'iPad'
      : /android/.test(ua)
        ? 'Android'
        : /windows/.test(ua)
          ? 'Windows'
          : /mac os/.test(ua)
            ? 'Mac'
            : /linux/.test(ua)
              ? 'Linux'
              : 'Other';
  return `${kind} · ${standalone ? 'installed app' : 'browser'}`;
}
