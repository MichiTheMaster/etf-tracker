import { Typography } from "@mui/material";
import { getLocale, useI18n } from "./i18n";

export const DEFAULT_QUOTE_REFRESH_SECONDS = 300;
export const DELAYED_ALIGN_MAX_SECONDS = 60;

export function parseQuoteTime(value) {
  if (value == null || value === "") {
    return NaN;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  const text = String(value).trim();
  const millisPrecision = text.replace(/(\.\d{3})\d+/, "$1");
  const parsed = Date.parse(millisPrecision);
  return Number.isFinite(parsed) ? parsed : Date.parse(text);
}

export function secondsUntil(isoTime, fallbackSeconds = DEFAULT_QUOTE_REFRESH_SECONDS) {
  const fallback = Math.max(1, Math.floor(Number(fallbackSeconds) || DEFAULT_QUOTE_REFRESH_SECONDS));
  const parsed = parseQuoteTime(isoTime);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(fallback, Math.ceil((parsed - Date.now()) / 1000)));
}

export function delayedAlignSeconds(isoTime, intervalSeconds) {
  const interval = Math.max(1, Math.floor(Number(intervalSeconds) || DEFAULT_QUOTE_REFRESH_SECONDS));
  const parsed = parseQuoteTime(isoTime);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const until = Math.ceil((parsed - Date.now()) / 1000);
  if (until < 1 || until > DELAYED_ALIGN_MAX_SECONDS || until >= interval) {
    return null;
  }
  return until;
}

export function formatCountdown(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatClock(value) {
  if (value == null || value === "") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleTimeString(getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function latestQuoteAsOf(quotes) {
  let latest = null;
  let delayed = false;
  Object.values(quotes || {}).forEach((quote) => {
    if (String(quote?.source || "").toLowerCase() === "delayed") {
      delayed = true;
    }
    if (!quote?.asOf) {
      return;
    }
    const parsed = parseQuoteTime(quote.asOf);
    if (!Number.isFinite(parsed)) {
      return;
    }
    if (latest == null || parsed > latest) {
      latest = parsed;
    }
  });
  return { asOfMs: latest, delayed };
}

export default function QuoteRefreshStatus({
  isRefreshing,
  countdown,
  quotes,
  awaitingDelayedTick = false,
  fallbackAsOf = null,
  refreshSeconds = null,
  nextAtMs = null
}) {
  const { t } = useI18n();
  const { asOfMs, delayed } = latestQuoteAsOf(quotes);
  const asOfLabel = formatClock(asOfMs || fallbackAsOf);
  const deadlineMs = Number(nextAtMs);
  const liveCountdown = deadlineMs > 0
    ? Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))
    : Math.max(0, Number(countdown) || 0);
  const nextAtLabel = formatClock(deadlineMs > 0 ? deadlineMs : Date.now() + liveCountdown * 1000);
  const intervalMinutes = Number.isFinite(Number(refreshSeconds)) && Number(refreshSeconds) > 0
    ? Math.round(Number(refreshSeconds) / 60)
    : null;
  const refreshLabel = awaitingDelayedTick
    ? t("quote.firstRefresh", { countdown: formatCountdown(liveCountdown), time: nextAtLabel })
    : t("quote.nextRefresh", { countdown: formatCountdown(liveCountdown), time: nextAtLabel });

  if (isRefreshing) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
        {t("quote.refreshing")}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
      {asOfLabel ? t("quote.asOf", { time: asOfLabel }) : t("quote.asOfUnknown")}
      {delayed ? t("quote.delayedHint") : ""}
      {intervalMinutes ? t("quote.intervalHint", { minutes: intervalMinutes }) : ""}
      {` · ${refreshLabel}`}
    </Typography>
  );
}
