import { relativeTime } from '../lib/time';

describe('relativeTime', () => {
  it('returns "just now" for times within the last 60 seconds', () => {
    const now = new Date().toISOString();
    expect(relativeTime(now)).toBe('just now');
  });

  it('returns minutes ago for times 1-59 minutes old', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours ago for times 60+ minutes old', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('returns "just now" for future dates (clamps to 0)', () => {
    const future = new Date(Date.now() + 60000).toISOString();
    expect(relativeTime(future)).toBe('just now');
  });

  it('returns 1m ago at exactly 60 seconds', () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(relativeTime(oneMinAgo)).toBe('1m ago');
  });

  it('returns 1h ago at exactly 60 minutes', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(relativeTime(oneHourAgo)).toBe('1h ago');
  });
});
