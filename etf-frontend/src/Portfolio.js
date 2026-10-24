import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import {
  calculateMetrics,
  fetchPortfolioBenchmarkSettings,
  fetchMarketQuoteSettings,
  fetchLivePrices,
  formatCurrency,
  formatPercent,
  loadCustomEtfs
} from "./simulatorStorage";
import { PortfolioAPI } from "./portfolioAPI";
import QuoteRefreshStatus, { DEFAULT_QUOTE_REFRESH_SECONDS } from "./QuoteRefreshStatus";
import { useQuoteRefreshTimer } from "./useQuoteRefreshTimer";
import { formatDateTime, getLocale, useI18n } from "./i18n";

const FRESH_QUOTE_SOURCES = new Set(["live", "cached", "delayed"]);
const DISPLAY_QUOTE_SOURCES = new Set(["live", "cached", "delayed", "fallback"]);
const WARMUP_RETRY_MS = 10_000;

function isPricedQuote(quote, allowedSources) {
  const price = Number(quote?.price);
  const source = String(quote?.source || "").toLowerCase();
  return Number.isFinite(price) && price > 0 && allowedSources.has(source);
}

function resolveSellPrice(symbol, quotes, holding) {
  const quotePrice = Number(quotes?.[symbol]?.price);
  if (Number.isFinite(quotePrice) && quotePrice > 0) {
    return { price: quotePrice, fromQuote: true };
  }

  const shares = Number(holding?.shares);
  const costTotal = Number(holding?.costTotal);
  const averageCost = shares > 0 ? costTotal / shares : NaN;
  if (Number.isFinite(averageCost) && averageCost > 0) {
    return { price: averageCost, fromQuote: false };
  }

  return { price: null, fromQuote: false };
}

function calculateBenchmarkReturnPct(annualRatePct, holdingDays) {
  const normalizedAnnualRatePct = Number(annualRatePct);
  const normalizedHoldingDays = Math.max(0, Math.floor(Number(holdingDays) || 0));

  if (!Number.isFinite(normalizedAnnualRatePct) || normalizedAnnualRatePct < 0) {
    return null;
  }

  const dailyRate = (normalizedAnnualRatePct / 100) / 365;
  return (Math.pow(1 + dailyRate, normalizedHoldingDays) - 1) * 100;
}

function hasQuoteCoverage(quoteData, symbols, customSymbols, allowedSources) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return true;
  }

  return symbols.every((symbol) => {
    if (customSymbols.has(symbol)) {
      return true;
    }
    return isPricedQuote(quoteData?.[symbol], allowedSources);
  });
}

export default function Portfolio() {
  const { t } = useI18n();
  const [state, setState] = useState(null);
  const [sellQuantities, setSellQuantities] = useState({});
  const [sellConfirm, setSellConfirm] = useState(null);
  const [sellNotice, setSellNotice] = useState("");
  const [error, setError] = useState("");
  const [quotes, setQuotes] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(DEFAULT_QUOTE_REFRESH_SECONDS);
  const [firstRefreshAt, setFirstRefreshAt] = useState(null);
  const [quotesFetchedAt, setQuotesFetchedAt] = useState(null);
  const [quotesSettled, setQuotesSettled] = useState(false);
  const { remaining, deadlineMs, awaitingDelayedTick, applySettings, armAfterFetch, consumeExpire } = useQuoteRefreshTimer();
  const [isLoading, setIsLoading] = useState(true);
  const [benchmarkAnnualRatePct, setBenchmarkAnnualRatePct] = useState(3);
  const [sortConfig, setSortConfig] = useState({ field: "symbol", direction: "asc" });
  const isRefreshingRef = useRef(false);
  const refreshQuotesRef = useRef(null);
  const warmupRetryRef = useRef(false);

  const [feeTransactionPct, setFeeTransactionPct] = useState("");
  const [feeDepotPct, setFeeDepotPct] = useState("");
  const [feeError, setFeeError] = useState("");
  const [feeSaved, setFeeSaved] = useState(false);
  const customSymbols = useMemo(
    () => new Set(loadCustomEtfs().map((etf) => etf.symbol)),
    []
  );

  // Load portfolio from API on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const [portfolioState, benchmarkSettings, quoteSettings] = await Promise.all([
          PortfolioAPI.load(),
          fetchPortfolioBenchmarkSettings(),
          fetchMarketQuoteSettings()
        ]);
        setState(portfolioState);
        setBenchmarkAnnualRatePct(Number(benchmarkSettings?.annualRatePct || 3));
        setRefreshSeconds(quoteSettings.quoteRefreshSeconds);
        setFirstRefreshAt(quoteSettings.firstRefreshAt);
        applySettings(quoteSettings.firstRefreshAt, quoteSettings.quoteRefreshSeconds);
        setFeeTransactionPct(
          portfolioState.transactionFeeRate == null
            ? "0"
            : (Number(portfolioState.transactionFeeRate) * 100).toFixed(4)
        );
        setFeeDepotPct(
          portfolioState.depotFeeRate == null
            ? "0"
            : (Number(portfolioState.depotFeeRate) * 100).toFixed(4)
        );
      } catch (err) {
        setError(err?.message || t("portfolio.loadFailed"));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPortfolio();
  }, [applySettings]);

  const refreshQuotes = useCallback(async (forceRefresh) => {
    if (!state) {
      return;
    }

    if (isRefreshingRef.current) {
      return;
    }

    const symbolsToRefresh = Object.keys(state?.holdings || {});
    if (symbolsToRefresh.length === 0) {
      setQuotes({});
      setQuotesSettled(true);
      armAfterFetch(forceRefresh);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      let data = await fetchLivePrices(forceRefresh, symbolsToRefresh);

      // Some providers return transient zero/missing prices right after page load.
      // Auto-retry once with force=true to mirror manual refresh behavior.
      if (!hasQuoteCoverage(data, symbolsToRefresh, customSymbols, FRESH_QUOTE_SOURCES)) {
        const retryData = await fetchLivePrices(true, symbolsToRefresh);
        if (retryData) {
          data = retryData;
        }
      }

      const received = data && typeof data === "object" ? data : {};
      setQuotes(received);
      setQuotesFetchedAt(Date.now());
      setQuotesSettled(true);

      if (
        !forceRefresh
        && !warmupRetryRef.current
        && !hasQuoteCoverage(received, symbolsToRefresh, customSymbols, FRESH_QUOTE_SOURCES)
      ) {
        warmupRetryRef.current = true;
        window.setTimeout(() => {
          refreshQuotesRef.current?.(false);
        }, WARMUP_RETRY_MS);
      }
    } finally {
      armAfterFetch(forceRefresh);
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [state, customSymbols, armAfterFetch]);

  refreshQuotesRef.current = refreshQuotes;

  useEffect(() => {
    if (!state) {
      return;
    }
    refreshQuotesRef.current?.(false);
  }, [state]);

  useEffect(() => {
    if (remaining > 0 || isRefreshing) {
      return;
    }
    if (!consumeExpire()) {
      return;
    }
    refreshQuotesRef.current?.(false);
  }, [remaining, isRefreshing, consumeExpire]);

  const trustedPriceMap = quotes
    ? Object.fromEntries(
        Object.entries(quotes)
          .filter(([symbol, quote]) => {
            if (customSymbols.has(symbol)) {
              return Number(quote?.price) > 0;
            }
            return isPricedQuote(quote, DISPLAY_QUOTE_SOURCES);
          })
          .map(([symbol, quote]) => [symbol, quote.price])
      )
    : {};

  const metrics = state ? calculateMetrics(state, trustedPriceMap, { allowCatalogFallback: false }) : null;
  const hasCashDeficit = Number(metrics?.cash || 0) < 0;
  const cashDeficitAmount = hasCashDeficit ? Math.abs(Number(metrics?.cash || 0)) : 0;
  const holdingSymbols = Object.keys(state?.holdings || {});
  const quotesReady = hasQuoteCoverage(quotes, holdingSymbols, customSymbols, DISPLAY_QUOTE_SOURCES);
  const hasHoldings = metrics ? metrics.positions.length > 0 : false;
  const shouldShowLivePortfolioValues = !hasHoldings || quotesReady || (quotesSettled && !isRefreshing);

  const handleSort = useCallback((field) => {
    setSortConfig((previous) => {
      if (previous.field === field) {
        return {
          field,
          direction: previous.direction === "asc" ? "desc" : "asc"
        };
      }
      return { field, direction: "asc" };
    });
  }, []);

  const sortedPositions = useMemo(() => {
    if (!metrics || !metrics.positions) return [];
    const directionFactor = sortConfig.direction === "asc" ? 1 : -1;
    const normalized = metrics.positions.map((position) => ({
      ...position,
      benchmarkReturnPct: calculateBenchmarkReturnPct(benchmarkAnnualRatePct, position.holdingDays),
      outperformancePct:
        position.currentPrice == null || position.pnlPct == null
          ? null
          : position.pnlPct - calculateBenchmarkReturnPct(benchmarkAnnualRatePct, position.holdingDays)
    }));

    normalized.sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.field === "symbol") {
        aValue = a.symbol || "";
        bValue = b.symbol || "";
        return aValue.localeCompare(bValue) * directionFactor;
      } else if (sortConfig.field === "shares") {
        aValue = Number(a.shares || 0);
        bValue = Number(b.shares || 0);
        return (aValue - bValue) * directionFactor;
      } else if (sortConfig.field === "averageCost") {
        aValue = Number(a.averageCost || 0);
        bValue = Number(b.averageCost || 0);
        return (aValue - bValue) * directionFactor;
      } else if (sortConfig.field === "currentPrice") {
        aValue = Number(a.currentPrice || 0);
        bValue = Number(b.currentPrice || 0);
        return (aValue - bValue) * directionFactor;
      } else if (sortConfig.field === "currentValue") {
        aValue = Number(a.currentValue || 0);
        bValue = Number(b.currentValue || 0);
        return (aValue - bValue) * directionFactor;
      } else if (sortConfig.field === "pnl") {
        aValue = Number(a.pnlAbs || 0);
        bValue = Number(b.pnlAbs || 0);
        return (aValue - bValue) * directionFactor;
      } else if (sortConfig.field === "benchmarkReturn") {
        aValue = Number(a.benchmarkReturnPct || 0);
        bValue = Number(b.benchmarkReturnPct || 0);
        return (aValue - bValue) * directionFactor;
      } else if (sortConfig.field === "outperformance") {
        aValue = Number(a.outperformancePct || 0);
        bValue = Number(b.outperformancePct || 0);
        return (aValue - bValue) * directionFactor;
      }

      return 0;
    });

    return normalized;
  }, [benchmarkAnnualRatePct, metrics, sortConfig]);

  const executeSell = async (symbol, quantity, sellPrice, fromQuote) => {
    try {
      const nextState = await PortfolioAPI.sell(symbol, quantity, sellPrice);
      setState(nextState);
      setError("");
      setSellConfirm(null);
      setSellQuantities((prev) => ({ ...prev, [symbol]: "" }));
      if (!fromQuote) {
        setSellNotice(
          t("portfolio.soldAtCost", { symbol, quantity, price: formatCurrency(sellPrice) })
        );
      } else {
        setSellNotice("");
      }
    } catch (sellError) {
      setError(sellError.message);
      setSellNotice("");
    }
  };

  const handleSell = async (symbol) => {
    const quantity = Number(sellQuantities[symbol] || 0);
    const resolved = resolveSellPrice(symbol, quotes, state?.holdings?.[symbol]);
    setError("");
    setSellNotice("");

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError(t("portfolio.invalidQty"));
      return;
    }

    if (!resolved.fromQuote) {
      if (!Number.isFinite(resolved.price) || resolved.price <= 0) {
        setError(t("portfolio.invalidPrice"));
        return;
      }
      setSellConfirm({ symbol, quantity, price: resolved.price });
      return;
    }

    await executeSell(symbol, quantity, resolved.price, true);
  };

  const handleSaveFees = async () => {
    setFeeError("");
    setFeeSaved(false);
    const txRate = Number.parseFloat(feeTransactionPct) / 100;
    const depotRate = Number.parseFloat(feeDepotPct) / 100;
    if (Number.isNaN(txRate) || txRate < 0 || txRate > 0.1) {
      setFeeError(t("portfolio.feeTxRange"));
      return;
    }
    if (Number.isNaN(depotRate) || depotRate < 0 || depotRate > 0.1) {
      setFeeError(t("portfolio.feeDepotRange"));
      return;
    }
    try {
      const nextState = await PortfolioAPI.updateFeeSettings(txRate, depotRate);
      setState(nextState);
      setFeeSaved(true);
    } catch (saveError) {
      setFeeError(saveError.message);
    }
  };

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography>{t("portfolio.loading")}</Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  }

  if (!state || !metrics) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography color="error">{t("portfolio.loadFailed")}</Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  }

  const summaryCards = [
    {
      title: t("portfolio.totalValue"),
      value: shouldShowLivePortfolioValues ? formatCurrency(metrics.totalValue) : t("common.loading"),
      tooltip: t("portfolio.totalValueHint"),
      color: "text.primary"
    },
    {
      title: t("portfolio.cash"),
      value: formatCurrency(metrics.cash),
      detail: hasCashDeficit ? t("portfolio.cashDeficit") : "",
      detailColor: "error.main",
      tooltip: hasCashDeficit ? t("portfolio.cashHintYes") : t("portfolio.cashHintNo"),
      color: hasCashDeficit ? "error.main" : "text.primary"
    },
    {
      title: t("portfolio.unrealized"),
      value: shouldShowLivePortfolioValues ? formatCurrency(metrics.unrealizedPnl) : t("common.loading"),
      tooltip: t("portfolio.unrealizedHint"),
      color: metrics.unrealizedPnl >= 0 ? "success.main" : "error.main"
    },
    {
      title: t("portfolio.returnTitle"),
      value: formatPercent(metrics.returns.totalReturnPct),
      tooltip: t("portfolio.returnHint"),
      color: metrics.returns.totalReturnPct >= 0 ? "success.main" : "error.main"
    },
    {
      title: t("portfolio.deficit"),
      value: formatCurrency(cashDeficitAmount),
      detail: hasCashDeficit ? t("portfolio.deficitNeeded") : "",
      detailColor: hasCashDeficit ? "error.main" : "text.secondary",
      tooltip: hasCashDeficit ? t("portfolio.deficitHintYes") : t("portfolio.deficitHintNo"),
      color: hasCashDeficit ? "error.main" : "success.main"
    }
  ];

  const renderSummaryCard = ({ title, value, detail, color = "text.primary", detailColor = "text.secondary", tooltip }) => (
    <Grid item xs={12} md={4} key={title}>
      <Tooltip
        title={<Typography variant="body2">{tooltip}</Typography>}
        arrow
        placement="top"
      >
        <Paper sx={{ p: 2, cursor: "help" }}>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" color={color}>
            {value}
          </Typography>
          {detail ? (
            <Typography variant="body2" color={detailColor}>
              {detail}
            </Typography>
          ) : null}
        </Paper>
      </Tooltip>
    </Grid>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {hasCashDeficit && (
        <Alert severity="warning" variant="filled">
          {t("portfolio.cashAlert")}
        </Alert>
      )}
      <Grid container spacing={3}>
        {summaryCards.map(renderSummaryCard)}
      </Grid>

      <Paper sx={{ p: { xs: 2, md: 3 }, overflow: "hidden" }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {t("portfolio.title")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => refreshQuotes(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? t("common.refreshing") : t("common.refresh")}
            </Button>
            <QuoteRefreshStatus
              isRefreshing={isRefreshing}
              countdown={remaining}
              quotes={quotes}
              awaitingDelayedTick={awaitingDelayedTick}
              fallbackAsOf={quotesFetchedAt}
              refreshSeconds={refreshSeconds}
              nextAtMs={deadlineMs}
            />
          </Box>

          {sellNotice && (
            <Alert
              severity="success"
              variant="filled"
              sx={{ mb: 2, borderRadius: 2 }}
              onClose={() => setSellNotice("")}
            >
              {sellNotice}
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              variant="filled"
              sx={{ mb: 2, borderRadius: 2, boxShadow: "0 10px 24px rgba(198, 40, 40, 0.18)" }}
            >
              {error}
            </Alert>
          )}

          <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5", "&:hover": { backgroundColor: "#f5f5f5" } }}>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "symbol" ? sortConfig.direction : false}>
                  <Tooltip title={t("common.sortHint")}>
                    <TableSortLabel
                      active={sortConfig.field === "symbol"}
                      direction={sortConfig.field === "symbol" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("symbol")}
                    >
                      {t("portfolio.symbol")}
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "shares" ? sortConfig.direction : false}>
                  <Tooltip title={t("common.sortHint")}>
                    <TableSortLabel
                      active={sortConfig.field === "shares"}
                      direction={sortConfig.field === "shares" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("shares")}
                    >
                      {t("portfolio.shares")}
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "averageCost" ? sortConfig.direction : false}>
                  <Tooltip title={t("common.sortHint")}>
                    <TableSortLabel
                      active={sortConfig.field === "averageCost"}
                      direction={sortConfig.field === "averageCost" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("averageCost")}
                    >
                      {t("portfolio.avgCost")}
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "currentPrice" ? sortConfig.direction : false}>
                  <Tooltip title={t("common.sortHint")}>
                    <TableSortLabel
                      active={sortConfig.field === "currentPrice"}
                      direction={sortConfig.field === "currentPrice" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("currentPrice")}
                    >
                      {t("portfolio.price")}
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "currentValue" ? sortConfig.direction : false}>
                  <Tooltip title={t("common.sortHint")}>
                    <TableSortLabel
                      active={sortConfig.field === "currentValue"}
                      direction={sortConfig.field === "currentValue" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("currentValue")}
                    >
                      {t("portfolio.value")}
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "pnl" ? sortConfig.direction : false}>
                  <Tooltip title={t("common.sortHint")}>
                    <TableSortLabel
                      active={sortConfig.field === "pnl"}
                      direction={sortConfig.field === "pnl" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("pnl")}
                    >
                      {t("portfolio.pnl")}
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "benchmarkReturn" ? sortConfig.direction : false}>
                  <Tooltip title={t("portfolio.benchmarkHint", { rate: (benchmarkAnnualRatePct / 100).toLocaleString(getLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 4 }) })}>
                    <TableSortLabel
                      active={sortConfig.field === "benchmarkReturn"}
                      direction={sortConfig.field === "benchmarkReturn" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("benchmarkReturn")}
                    >
                      {t("portfolio.benchmark")}
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "outperformance" ? sortConfig.direction : false}>
                  <Tooltip title={t("portfolio.performanceHint")}>
                    <TableSortLabel
                      active={sortConfig.field === "outperformance"}
                      direction={sortConfig.field === "outperformance" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("outperformance")}
                    >
                      {t("portfolio.performance")}
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>{t("portfolio.added")}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>{t("portfolio.sell")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPositions.map((position) => {
                const positionReady = customSymbols.has(position.symbol)
                  || isPricedQuote(quotes?.[position.symbol], DISPLAY_QUOTE_SOURCES);
                const positionPending = !positionReady && (!quotesSettled || isRefreshing);
                const positionLabel = positionReady
                  ? null
                  : (positionPending ? t("common.loading") : t("portfolio.missingQuote"));
                return (
                <TableRow key={position.symbol}>
                  <TableCell>{position.symbol}</TableCell>
                  <TableCell>{position.shares}</TableCell>
                  <TableCell>{formatCurrency(position.averageCost)}</TableCell>
                  <TableCell>{positionReady ? formatCurrency(position.currentPrice) : positionLabel}</TableCell>
                  <TableCell>{positionReady ? formatCurrency(position.currentValue) : positionLabel}</TableCell>
                  <TableCell
                    sx={{ color: positionReady && position.pnlAbs >= 0 ? "success.main" : "error.main" }}
                  >
                    {positionReady ? `${formatCurrency(position.pnlAbs)} (${formatPercent(position.pnlPct)})` : positionLabel}
                  </TableCell>
                  <TableCell sx={{ color: "info.main" }}>
                    {formatPercent(position.benchmarkReturnPct)}
                  </TableCell>
                  <TableCell
                    sx={{
                      color:
                        position.outperformancePct == null
                          ? "text.secondary"
                          : position.outperformancePct >= 0
                          ? "success.main"
                          : "error.main"
                    }}
                  >
                    {positionReady ? formatPercent(position.outperformancePct) : t("common.dash")}
                  </TableCell>
                  <TableCell>{formatDateTime(position.addedAt)}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 1, step: 1 }}
                      value={sellQuantities[position.symbol] || ""}
                      onChange={(event) =>
                        setSellQuantities((prev) => ({
                          ...prev,
                          [position.symbol]: event.target.value
                        }))
                      }
                      sx={{ width: 90, mr: 1 }}
                    />
                    <Button variant="outlined" onClick={() => handleSell(position.symbol)}>
                      {t("portfolio.sellAction")}
                    </Button>
                    {!positionReady && !positionPending && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        {t("portfolio.sellAtCostHint")}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TableContainer>

          {metrics.positions.length === 0 && (
            <Typography sx={{ mt: 2 }} color="text.secondary">
              {t("portfolio.empty")}
            </Typography>
          )}

          <Dialog
            open={Boolean(sellConfirm)}
            onClose={() => setSellConfirm(null)}
            PaperProps={{
              sx: {
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 24px 60px rgba(25, 118, 210, 0.24)",
                overflow: "hidden"
              }
            }}
          >
            <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>{t("portfolio.noQuoteTitle")}</DialogTitle>
            <DialogContent sx={{ pt: "8px !important" }}>
              <DialogContentText sx={{ color: "text.primary" }}>
                {t("portfolio.noQuoteBody", { symbol: sellConfirm?.symbol ?? "" })}
              </DialogContentText>
              <DialogContentText sx={{ mt: 1, color: "text.secondary", fontSize: "0.9rem" }}>
                {sellConfirm
                  ? t("portfolio.noQuoteCost", { quantity: sellConfirm.quantity, price: formatCurrency(sellConfirm.price) })
                  : ""}
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
              <Button onClick={() => setSellConfirm(null)} variant="outlined">
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (!sellConfirm) {
                    return;
                  }
                  executeSell(sellConfirm.symbol, sellConfirm.quantity, sellConfirm.price, false);
                }}
                variant="contained"
              >
                {t("portfolio.sellAction")}
              </Button>
            </DialogActions>
          </Dialog>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 3 }, overflow: "hidden" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("portfolio.feesTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("portfolio.feesIntro")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end", flexWrap: "wrap" }}>
          <TextField
            label={t("portfolio.txFee")}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 10, step: 0.01 } }}
            value={feeTransactionPct}
            onChange={(e) => { setFeeTransactionPct(e.target.value); setFeeSaved(false); }}
            sx={{ width: 200 }}
            helperText={t("portfolio.txFeeHelp")}
          />
          <TextField
            label={t("portfolio.depotFee")}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 10, step: 0.01 } }}
            value={feeDepotPct}
            onChange={(e) => { setFeeDepotPct(e.target.value); setFeeSaved(false); }}
            sx={{ width: 200 }}
            helperText={t("portfolio.depotFeeHelp")}
          />
          <Button variant="contained" onClick={handleSaveFees}>
            {t("common.save")}
          </Button>
        </Box>
        {feeError && (
          <Alert severity="error" sx={{ mt: 2 }}>{feeError}</Alert>
        )}
        {feeSaved && (
          <Alert severity="success" sx={{ mt: 2 }}>{t("portfolio.feesSaved")}</Alert>
        )}
      </Paper>
    </Box>
  );
}
