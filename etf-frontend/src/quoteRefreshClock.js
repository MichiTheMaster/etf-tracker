import {
  DEFAULT_QUOTE_REFRESH_SECONDS,
  delayedAlignSeconds
} from "./QuoteRefreshStatus";

const STORAGE_KEY = "etf.quoteRefreshClock.v1";

function normalizeInterval(refreshSeconds) {
  return Math.max(1, Math.floor(Number(refreshSeconds) || DEFAULT_QUOTE_REFRESH_SECONDS));
}

function readStoredClock() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const storedDeadline = Number(parsed?.deadlineMs);
    return {
      intervalSec: normalizeInterval(parsed?.intervalSec),
      deadlineMs: Number.isFinite(storedDeadline) ? storedDeadline : 0,
      firstAlignDone: Boolean(parsed?.firstAlignDone)
    };
  } catch {
    return null;
  }
}

function persistClock() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      intervalSec,
      deadlineMs,
      firstAlignDone
    }));
  } catch {
    // private mode / missing sessionStorage
  }
}

const stored = typeof sessionStorage === "undefined" ? null : readStoredClock();
let intervalSec = stored?.intervalSec || DEFAULT_QUOTE_REFRESH_SECONDS;
let deadlineMs = stored?.deadlineMs || 0;
let firstAlignDone = stored?.firstAlignDone || false;

export function getRefreshIntervalSeconds() {
  return intervalSec;
}

export function getRefreshDeadlineMs() {
  return deadlineMs;
}

export function remainingSecondsFromDeadline(now = Date.now()) {
  if (deadlineMs <= 0) {
    return 0;
  }
  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
}

export function setRefreshIntervalSeconds(refreshSeconds) {
  intervalSec = normalizeInterval(refreshSeconds);
  persistClock();
  return intervalSec;
}

export function startRefreshCycle(fromMs = Date.now()) {
  firstAlignDone = true;
  deadlineMs = fromMs + intervalSec * 1000;
  persistClock();
  return deadlineMs;
}

export function ensureRefreshDeadline(firstRefreshAt) {
  const now = Date.now();
  if (deadlineMs > now) {
    return deadlineMs;
  }
  if (!firstAlignDone) {
    const delayedWait = delayedAlignSeconds(firstRefreshAt, intervalSec);
    if (delayedWait != null) {
      deadlineMs = now + delayedWait * 1000;
      persistClock();
      return deadlineMs;
    }
  }
  return startRefreshCycle(now);
}

export function markFirstAlignDone() {
  firstAlignDone = true;
  persistClock();
}

export function resetRefreshClockForTests(options = {}) {
  if (options.restoreFromStorage) {
    const restored = readStoredClock();
    intervalSec = restored?.intervalSec || DEFAULT_QUOTE_REFRESH_SECONDS;
    deadlineMs = restored?.deadlineMs || 0;
    firstAlignDone = restored?.firstAlignDone || false;
    return;
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  intervalSec = DEFAULT_QUOTE_REFRESH_SECONDS;
  deadlineMs = 0;
  firstAlignDone = false;
}
