import { describe, expect, it } from 'vitest';
import { describeDevice, issueUrl } from './feedback';

describe('feedback links', () => {
  it('builds a pre-filled issue-form URL', () => {
    const url = new URL(
      issueUrl('me/punch-clock', 'idea', {
        appVersion: '1.2.0',
        language: 'de',
        device: 'iPhone · installed app',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://github.com/me/punch-clock/issues/new');
    expect(url.searchParams.get('template')).toBe('idea.yml');
    expect(url.searchParams.get('environment')).toBe('App 1.2.0 · de · iPhone · installed app');
    expect(
      new URL(
        issueUrl('me/x', 'bug', { appVersion: '1', language: 'en', device: 'd' }),
      ).searchParams.get('template'),
    ).toBe('bug.yml');
  });

  it('describes devices coarsely', () => {
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    expect(describeDevice(iphone, true)).toBe('iPhone · installed app');
    expect(
      describeDevice('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/130 Mobile', false),
    ).toBe('Android · browser');
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130', false)).toBe(
      'Windows · browser',
    );
  });
});
