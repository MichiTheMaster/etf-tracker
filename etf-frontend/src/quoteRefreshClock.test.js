import {
  ensureRefreshDeadline,
  getRefreshDeadlineMs,
  remainingSecondsFromDeadline,
  resetRefreshClockForTests,
  setRefreshIntervalSeconds,
  startRefreshCycle
} from "./quoteRefreshClock";

describe("quoteRefreshClock", () => {
  beforeEach(() => {
    resetRefreshClockForTests();
    setRefreshIntervalSeconds(900);
  });

  test("remaining is the difference between now and the deadline clock", () => {
    const started = Date.now() - 120_000;
    startRefreshCycle(started);
    expect(remainingSecondsFromDeadline()).toBeGreaterThanOrEqual(779);
    expect(remainingSecondsFromDeadline()).toBeLessThanOrEqual(781);
  });

  test("keeps an existing future deadline instead of starting 15 minutes again", () => {
    const first = startRefreshCycle(Date.now());
    const later = ensureRefreshDeadline(null);
    expect(later).toBe(first);
    expect(getRefreshDeadlineMs()).toBe(first);
    expect(remainingSecondsFromDeadline()).toBeLessThanOrEqual(900);
    expect(remainingSecondsFromDeadline()).toBeGreaterThan(890);
  });

  test("starts a new cycle only after the deadline has passed", () => {
    const expired = startRefreshCycle(Date.now() - 901_000);
    const next = ensureRefreshDeadline(null);
    expect(next).toBeGreaterThan(expired);
    expect(next).toBeGreaterThan(Date.now());
  });

  test("restores the deadline after a remount", () => {
    const first = startRefreshCycle(Date.now());
    resetRefreshClockForTests({ restoreFromStorage: true });
    expect(getRefreshDeadlineMs()).toBe(first);
    expect(ensureRefreshDeadline(null)).toBe(first);
  });
});
