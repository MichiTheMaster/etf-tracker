import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureRefreshDeadline,
  getRefreshDeadlineMs,
  markFirstAlignDone,
  remainingSecondsFromDeadline,
  setRefreshIntervalSeconds,
  startRefreshCycle
} from "./quoteRefreshClock";

export function useQuoteRefreshTimer() {
  const expireLockRef = useRef(false);
  const [remaining, setRemaining] = useState(() => remainingSecondsFromDeadline());
  const [deadlineMs, setDeadlineMs] = useState(() => getRefreshDeadlineMs());
  const [awaitingDelayedTick, setAwaitingDelayedTick] = useState(false);

  const syncRemaining = useCallback(() => {
    const deadline = getRefreshDeadlineMs();
    setDeadlineMs(deadline);
    setRemaining(remainingSecondsFromDeadline());
    return remainingSecondsFromDeadline();
  }, []);

  const adoptDeadline = useCallback((nextDeadline, delayed = false) => {
    expireLockRef.current = false;
    setAwaitingDelayedTick(delayed);
    setDeadlineMs(nextDeadline);
    setRemaining(remainingSecondsFromDeadline());
  }, []);

  const applySettings = useCallback((firstRefreshAt, refreshSeconds) => {
    setRefreshIntervalSeconds(refreshSeconds);
    const previous = getRefreshDeadlineMs();
    const now = Date.now();
    const hadFutureDeadline = previous > now;
    const nextDeadline = ensureRefreshDeadline(firstRefreshAt);
    const startedDelayed = !hadFutureDeadline && nextDeadline > now && nextDeadline - now <= 60_000;
    if (!startedDelayed) {
      markFirstAlignDone();
    }
    adoptDeadline(nextDeadline, startedDelayed);
  }, [adoptDeadline]);

  const armAfterFetch = useCallback((forceRefresh) => {
    if (forceRefresh) {
      markFirstAlignDone();
      adoptDeadline(startRefreshCycle(), false);
      return;
    }
    const existing = getRefreshDeadlineMs();
    if (existing > Date.now()) {
      markFirstAlignDone();
      adoptDeadline(existing, false);
      return;
    }
    adoptDeadline(ensureRefreshDeadline(null), false);
  }, [adoptDeadline]);

  const consumeExpire = useCallback(() => {
    const deadline = getRefreshDeadlineMs();
    if (expireLockRef.current || deadline <= 0 || deadline > Date.now()) {
      return false;
    }
    expireLockRef.current = true;
    markFirstAlignDone();
    setAwaitingDelayedTick(false);
    return true;
  }, []);

  useEffect(() => {
    const id = setInterval(syncRemaining, 1000);
    document.addEventListener("visibilitychange", syncRemaining);
    syncRemaining();
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", syncRemaining);
    };
  }, [syncRemaining]);

  return {
    remaining,
    deadlineMs,
    awaitingDelayedTick,
    applySettings,
    armAfterFetch,
    consumeExpire
  };
}
