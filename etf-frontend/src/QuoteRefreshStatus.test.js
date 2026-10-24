import { delayedAlignSeconds, secondsUntil } from "./QuoteRefreshStatus";

describe("delayedAlignSeconds", () => {
  test("uses a delayed tick only when it is within 60 seconds", () => {
    const soon = new Date(Date.now() + 20_000).toISOString();
    expect(delayedAlignSeconds(soon, 900)).toBeGreaterThanOrEqual(1);
    expect(delayedAlignSeconds(soon, 900)).toBeLessThanOrEqual(20);
  });

  test("falls back to the admin interval when the delayed tick is several minutes away", () => {
    const later = new Date(Date.now() + 4 * 60_000 + 15_000).toISOString();
    expect(delayedAlignSeconds(later, 900)).toBeNull();
    expect(secondsUntil(later, 900)).toBeGreaterThan(240);
  });

  test("does not wait for a delayed tick when the timestamp is missing", () => {
    expect(delayedAlignSeconds(null, 900)).toBeNull();
  });
});
