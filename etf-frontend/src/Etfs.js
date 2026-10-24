import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  DEFAULT_ETF_SYMBOLS,
  ETF_CATALOG,
  fetchRiskMetrics,
  fetchLivePrices,
  fetchMarketQuoteSettings,
  formatCurrency,
  quoteSourceLabel,
  searchEtfPool
} from "./simulatorStorage";
import { PortfolioAPI } from "./portfolioAPI";
import QuoteRefreshStatus, { DEFAULT_QUOTE_REFRESH_SECONDS } from "./QuoteRefreshStatus";
import { useQuoteRefreshTimer } from "./useQuoteRefreshTimer";
import { formatDateTime, useI18n } from "./i18n";

const MIN_POOL_QUERY_LENGTH = 1;
const MAX_POOL_RESULTS = 20;

const ETF_ISIN_BY_SYMBOL = {
  VWCE: "IE00BK5BQT80",
  EUNL: "IE00B4L5Y983",
  EMIM: "IE00BKM4GZ66",
  IS3N: "IE00BKM4GZ66",
  SXR8: "IE00B5BMR087",
  EXSA: "DE0002635307",
  SPYD: "IE00B6YX5D40",
  IUSN: "IE00BF4RFH31",
  CSPX: "IE00B5BMR087",
  VUSA: "IE00B3XXRP09",
  XDAX: "LU0274211480",
  IMEU: "IE00B4K48X80",
  EIMI: "IE00BKM4GZ66"
};

export default function Etfs() {
  const { t } = useI18n();
  const [state, setState] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");
  const [quotes, setQuotes] = useState(null);
  const [riskMetrics, setRiskMetrics] = useState({});
  const [riskStatuses, setRiskStatuses] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(DEFAULT_QUOTE_REFRESH_SECONDS);
  const [firstRefreshAt, setFirstRefreshAt] = useState(null);
  const [quotesFetchedAt, setQuotesFetchedAt] = useState(null);
  const { remaining, deadlineMs, awaitingDelayedTick, applySettings, armAfterFetch, consumeExpire } = useQuoteRefreshTimer();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSymbols, setSelectedSymbols] = useState(DEFAULT_ETF_SYMBOLS);
  const [customEtfs, setCustomEtfs] = useState([]);
  const [poolQuery, setPoolQuery] = useState("");
  const [poolResults, setPoolResults] = useState([]);
  const [isPoolLoading, setIsPoolLoading] = useState(false);
  const [filterUcits, setFilterUcits] = useState(false);
  const [filterEur, setFilterEur] = useState(false);
  const [filterXetra, setFilterXetra] = useState(false);
  const [sortConfig, setSortConfig] = useState({ field: "symbol", direction: "asc" });
  const [selectedAddedAt, setSelectedAddedAt] = useState({});
  const [removeDialogSymbol, setRemoveDialogSymbol] = useState("");
  const isRefreshingRef = useRef(false);
  const refreshQuotesRef = useRef(null);

  const catalog = useMemo(() => [...ETF_CATALOG, ...customEtfs], [customEtfs]);

  const visibleEtfs = useMemo(() => {
    const symbols = selectedSymbols.length > 0 ? selectedSymbols : DEFAULT_ETF_SYMBOLS;
    return symbols
      .map((symbol) => catalog.find((etf) => etf.symbol === symbol))
      .filter(Boolean);
  }, [selectedSymbols, catalog]);

  const sortedVisibleEtfs = useMemo(() => {
    const directionFactor = sortConfig.direction === "asc" ? 1 : -1;
    const normalized = [...visibleEtfs];

    normalized.sort((a, b) => {
      if (sortConfig.field === "price") {
        const aQuotePrice = quotes?.[a.symbol]?.price;
        const bQuotePrice = quotes?.[b.symbol]?.price;
        const aPrice = aQuotePrice > 0 ? aQuotePrice : a.price;
        const bPrice = bQuotePrice > 0 ? bQuotePrice : b.price;

        if (aPrice !== bPrice) {
          return (aPrice - bPrice) * directionFactor;
        }
        return a.symbol.localeCompare(b.symbol);
      }

      const aValue = (a[sortConfig.field] || "").toString();
      const bValue = (b[sortConfig.field] || "").toString();
      return aValue.localeCompare(bValue) * directionFactor;
    });

    return normalized;
  }, [visibleEtfs, quotes, sortConfig]);

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

  const poolDisplayResults = useMemo(() => {
    const normalized = (value) => (value || "").toUpperCase();

    const matches = poolResults.filter((item) => {
      const name = normalized(item.name);
      const exchange = normalized(item.exchange);
      const currency = normalized(item.currency);

      const isUcits = name.includes("UCITS");
      const isEur = currency === "EUR";
      const isXetra = exchange.includes("XETRA") || exchange.includes("GER") || exchange.includes("FRA");

      if (filterUcits && !isUcits) {
        return false;
      }
      if (filterEur && !isEur) {
        return false;
      }
      if (filterXetra && !isXetra) {
        return false;
      }
      return true;
    });

    return matches.sort((a, b) => {
      const score = (item) => {
        const name = normalized(item.name);
        const exchange = normalized(item.exchange);
        const currency = normalized(item.currency);
        let s = 0;
        if (name.includes("UCITS")) s += 4;
        if (currency === "EUR") s += 3;
        if (exchange.includes("XETRA") || exchange.includes("GER") || exchange.includes("FRA")) s += 2;
        return s;
      };

      const diff = score(b) - score(a);
      if (diff !== 0) {
        return diff;
      }
      return (a.symbol || "").localeCompare(b.symbol || "");
    });
  }, [poolResults, filterUcits, filterEur, filterXetra]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!poolQuery.trim() || poolQuery.trim().length < MIN_POOL_QUERY_LENGTH) {
        setPoolResults([]);
        setIsPoolLoading(false);
        return;
      }

      setIsPoolLoading(true);
      const results = await searchEtfPool(poolQuery, MAX_POOL_RESULTS);
      setPoolResults(results);
      setIsPoolLoading(false);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [poolQuery]);

  // Load portfolio from API on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const portfolioState = await PortfolioAPI.load();
        setState(portfolioState);

        const preferences = await PortfolioAPI.loadEtfPreferences();
        const nextCustomEtfs = Array.isArray(preferences?.customEtfs) ? preferences.customEtfs : [];
        const nextSelectedSymbols = Array.isArray(preferences?.selectedSymbols)
          ? preferences.selectedSymbols
          : DEFAULT_ETF_SYMBOLS;

        setCustomEtfs(nextCustomEtfs);
        setSelectedSymbols(nextSelectedSymbols.length > 0 ? nextSelectedSymbols : DEFAULT_ETF_SYMBOLS);
        setSelectedAddedAt(preferences?.selectedAddedAt || {});
      } catch (err) {
        setError(err?.message || t("etfs.loadFailed"));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPortfolio();
  }, []);

  const persistEtfPreferences = useCallback(async (nextSelectedSymbols, nextCustomEtfs) => {
    try {
      const response = await PortfolioAPI.saveEtfPreferences(nextSelectedSymbols, nextCustomEtfs);
      if (response?.selectedAddedAt) {
        setSelectedAddedAt(response.selectedAddedAt);
      }
    } catch (persistError) {
      setError(persistError?.message || t("etfs.prefsSaveFailed"));
      throw persistError;
    }
  }, []);

  const refreshQuotes = useCallback(async (forceRefresh) => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    const symbols = visibleEtfs.map((etf) => etf.symbol);
    try {
      const quoteData = await fetchLivePrices(forceRefresh, symbols);
      if (quoteData) {
        setQuotes(quoteData);
        setQuotesFetchedAt(Date.now());
      }
    } finally {
      armAfterFetch(forceRefresh);
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
    fetchRiskMetrics(symbols).then((riskResult) => {
      setRiskMetrics(riskResult?.data || {});
      setRiskStatuses(riskResult?.statusBySymbol || {});
    });
  }, [visibleEtfs, armAfterFetch]);

  refreshQuotesRef.current = refreshQuotes;

  useEffect(() => {
    let cancelled = false;
    fetchMarketQuoteSettings().then((status) => {
      if (cancelled) {
        return;
      }
      setRefreshSeconds(status.quoteRefreshSeconds);
      setFirstRefreshAt(status.firstRefreshAt);
      applySettings(status.firstRefreshAt, status.quoteRefreshSeconds);
    });
    return () => {
      cancelled = true;
    };
  }, [applySettings]);

  const visibleSymbolsKey = visibleEtfs.map((etf) => etf.symbol).join(",");

  useEffect(() => {
    refreshQuotesRef.current?.(false);
  }, [visibleSymbolsKey]);

  useEffect(() => {
    if (remaining > 0 || isRefreshing) {
      return;
    }
    if (!consumeExpire()) {
      return;
    }
    refreshQuotesRef.current?.(false);
  }, [remaining, isRefreshing, consumeExpire]);

  const pendingTotal = useMemo(
    () =>
      visibleEtfs.reduce((sum, etf) => {
        const quantity = Number(quantities[etf.symbol] || 0);
        const quotePrice = quotes?.[etf.symbol]?.price;
        const price = quotePrice > 0 ? quotePrice : etf.price;
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return sum;
        }
        return sum + quantity * price;
      }, 0),
    [quantities, quotes, visibleEtfs]
  );

  const remainingCashAfterInput = state ? state.cash - pendingTotal : 0;

  const handleBuy = async (symbol) => {
    const quantity = Number(quantities[symbol] || 0);
    const livePrice = quotes?.[symbol]?.price ?? null;

    try {
      const nextState = await PortfolioAPI.buy(symbol, quantity, livePrice);
      setState(nextState);
      setError("");
      setQuantities((prev) => ({ ...prev, [symbol]: "" }));
    } catch (buyError) {
      setError(buyError.message);
    }
  };

  const handleAddEtfFromPool = async (poolItem) => {
    const symbol = poolItem.symbol?.toUpperCase();
    if (!symbol || selectedSymbols.includes(symbol)) {
      return;
    }

    const initialPoolPrice = Number(poolItem?.marketPrice);
    const hasInitialPoolPrice = Number.isFinite(initialPoolPrice) && initialPoolPrice > 0;

    if (!catalog.some((etf) => etf.symbol === symbol)) {
      const nextCustomEtfs = [
        ...customEtfs,
        {
          symbol,
          name: poolItem.name || symbol,
          price: hasInitialPoolPrice ? initialPoolPrice : 0,
          ter: 0,
          source: "custom"
        }
      ];
      setCustomEtfs(nextCustomEtfs);

      const nextSymbols = [...selectedSymbols, symbol];
      setSelectedSymbols(nextSymbols);
      await persistEtfPreferences(nextSymbols, nextCustomEtfs);
    } else {
      const nextSymbols = [...selectedSymbols, symbol];
      setSelectedSymbols(nextSymbols);
      await persistEtfPreferences(nextSymbols, customEtfs);
    }

    setPoolQuery("");
    setPoolResults([]);

    if (hasInitialPoolPrice) {
      setQuotes((prev) => ({
        ...(prev || {}),
        [symbol]: { symbol, price: initialPoolPrice, source: "delayed" }
      }));
    }

    // Sofort Kurse für das neue ETF abrufen (ohne Force, um API-Limits zu schonen)
    try {
      const newQuotes = await fetchLivePrices(false, [symbol]);
      if (newQuotes) {
        setQuotes((prev) => ({ ...prev, ...newQuotes }));
      }
    } catch (_err) {
      // Fehler ignorieren, wird später durch Auto-Refresh aktualisiert
    }
  };

  const handleRemoveEtf = (symbol) => {
    const shares = state?.holdings?.[symbol]?.shares || 0;
    if (shares > 0) {
      setError(t("etfs.removeHeld"));
      return;
    }

    if (selectedSymbols.length <= 1) {
      setError(t("etfs.removeLast"));
      return;
    }

    setRemoveDialogSymbol(symbol);
  };

  const handleCloseRemoveDialog = () => {
    setRemoveDialogSymbol("");
  };

  const handleConfirmRemoveEtf = () => {
    const symbol = removeDialogSymbol;
    if (!symbol) {
      return;
    }

    const nextSymbols = selectedSymbols.filter((s) => s !== symbol);
    setSelectedSymbols(nextSymbols);

    const isDefault = ETF_CATALOG.some((etf) => etf.symbol === symbol);
    let nextCustomEtfs = customEtfs;
    if (!isDefault) {
      nextCustomEtfs = customEtfs.filter((etf) => etf.symbol !== symbol);
      setCustomEtfs(nextCustomEtfs);
    }

    persistEtfPreferences(nextSymbols, nextCustomEtfs).catch(() => {
      // Error message is already set in persistEtfPreferences.
    });

    setQuantities((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
    setError("");
    setRemoveDialogSymbol("");
  };

  if (isLoading) {
    return <Paper sx={{ p: 3 }}><Typography>{t("etfs.loading")}</Typography></Paper>;
  }

  if (!state) {
    return <Paper sx={{ p: 3 }}><Typography color="error">{t("etfs.loadFailed")}</Typography></Paper>;
  }

  const getRiskTone = (riskLevel) => {
    if (riskLevel === "konservativ") {
      return { barColor: "#2e7d32", trackColor: "rgba(46, 125, 50, 0.16)", textColor: "success.main" };
    }
    if (riskLevel === "moderat") {
      return { barColor: "#ed6c02", trackColor: "rgba(237, 108, 2, 0.16)", textColor: "warning.main" };
    }
    return { barColor: "#d32f2f", trackColor: "rgba(211, 47, 47, 0.16)", textColor: "error.main" };
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, overflow: "hidden" }}>
      <Typography
        variant="h4"
        sx={{
          mb: 0.5,
          fontWeight: 800,
          letterSpacing: "0.01em"
        }}
      >
        {t("etfs.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t("etfs.cashLine", { cash: formatCurrency(state.cash), after: formatCurrency(remainingCashAfterInput) })}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        {t("etfs.heldHint")}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 2 }}>
        <Autocomplete
          size="small"
          sx={{ width: "100%", maxWidth: 760, minWidth: 0 }}
          options={poolDisplayResults}
          loading={isPoolLoading}
          inputValue={poolQuery}
          onInputChange={(_event, value) => setPoolQuery(value)}
          onChange={(_event, value) => {
            if (value) {
              handleAddEtfFromPool(value);
            }
          }}
          getOptionLabel={(option) => {
            if (typeof option === "string") {
              return option;
            }
            return `${option.symbol || t("common.dash")} - ${option.name || ""}`;
          }}
          isOptionEqualToValue={(option, value) => option.symbol === value.symbol}
          noOptionsText={
            !poolQuery.trim() || poolQuery.trim().length < MIN_POOL_QUERY_LENGTH
              ? t("etfs.minChars")
              : t("etfs.noResults")
          }
          renderOption={(props, option) => {
            const symbol = option.symbol?.toUpperCase() || t("common.dash");
            return (
              <Box component="li" {...props} key={`${symbol}-${option.exchange || t("common.dash")}`}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {symbol} - {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.exchange || t("common.dash")} | {option.currency || t("common.dash")}
                  </Typography>
                </Box>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("etfs.search")}
              placeholder={t("etfs.searchPlaceholder")}
              helperText={
                poolQuery.trim().length > 0 && poolQuery.trim().length < MIN_POOL_QUERY_LENGTH
                  ? t("etfs.minCharsHint")
                  : t("etfs.searchHelp")
              }
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isPoolLoading ? <CircularProgress color="inherit" size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Tooltip title={t("etfs.ucitsHint")}>
            <FormControlLabel
              control={<Checkbox size="small" checked={filterUcits} onChange={(e) => setFilterUcits(e.target.checked)} />}
              label={t("etfs.ucits")}
            />
          </Tooltip>
          <Tooltip title={t("etfs.eurHint")}>
            <FormControlLabel
              control={<Checkbox size="small" checked={filterEur} onChange={(e) => setFilterEur(e.target.checked)} />}
              label={t("etfs.eur")}
            />
          </Tooltip>
          <Tooltip title={t("etfs.xetraHint")}>
            <FormControlLabel
              control={<Checkbox size="small" checked={filterXetra} onChange={(e) => setFilterXetra(e.target.checked)} />}
              label={t("etfs.xetra")}
            />
          </Tooltip>
        </Box>

        {poolQuery.trim() && poolDisplayResults.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {t("etfs.hitCount", { count: poolDisplayResults.length })}
          </Typography>
        )}
      </Box>

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
                  {t("etfs.symbol")}
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>{t("etfs.isin")}</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "name" ? sortConfig.direction : false}>
              <Tooltip title={t("common.sortHint")}>
                <TableSortLabel
                  active={sortConfig.field === "name"}
                  direction={sortConfig.field === "name" ? sortConfig.direction : "asc"}
                  onClick={() => handleSort("name")}
                >
                  {t("etfs.name")}
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "price" ? sortConfig.direction : false}>
              <Tooltip title={t("common.sortHint")}>
                <TableSortLabel
                  active={sortConfig.field === "price"}
                  direction={sortConfig.field === "price" ? sortConfig.direction : "asc"}
                  onClick={() => handleSort("price")}
                >
                  {t("etfs.price")}
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>
              <Tooltip title={t("etfs.terHint")}>
                <span>{t("etfs.ter")}</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333", minWidth: 210 }}>
              <Tooltip title={t("etfs.riskHint")}>
                <span>{t("etfs.risk")}</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>{t("etfs.quantity")}</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>{t("etfs.sum")}</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>{t("etfs.added")}</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>{t("etfs.buy")}</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333", textAlign: "center" }}>
              <Tooltip title={t("etfs.remove")}>
                <DeleteOutlineIcon sx={{ fontSize: 18, verticalAlign: "middle", color: "text.secondary" }} />
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedVisibleEtfs.map((etf) => {
            const quantity = Number(quantities[etf.symbol] || 0);
            const sharesInPortfolio = state?.holdings?.[etf.symbol]?.shares || 0;
            const quotePrice = quotes?.[etf.symbol]?.price;
            const quoteTer = quotes?.[etf.symbol]?.ter;
            const isin = ETF_ISIN_BY_SYMBOL[etf.symbol] || t("common.dash");
            const price = quotePrice > 0 ? quotePrice : etf.price;
            const terValue = quoteTer > 0 ? quoteTer : etf.ter;
            const riskEntry = riskMetrics?.[etf.symbol] || null;
            const riskStatus = riskStatuses?.[etf.symbol] || null;
            const rowTotal = Number.isFinite(quantity) && quantity > 0 ? quantity * price : 0;
            const buyDisabled = !Number.isInteger(quantity) || quantity <= 0 || rowTotal > state.cash;
            const riskTone = getRiskTone(riskEntry?.riskLevel);
            const riskScore = Math.max(0, Math.min(100, Number(riskEntry?.riskScore || 0)));

            return (
              <TableRow
                key={etf.symbol}
                sx={
                  sharesInPortfolio > 0
                    ? {
                        backgroundColor: "rgba(46, 125, 50, 0.10)",
                        "&:hover": { backgroundColor: "rgba(46, 125, 50, 0.16)" }
                      }
                    : undefined
                }
              >
                <TableCell>
                  {etf.symbol}
                  {sharesInPortfolio > 0 && (
                    <Chip
                      label={t("etfs.inPortfolio")}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ ml: 1, height: 18, fontSize: "0.6rem" }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{isin}</TableCell>
                <TableCell>{etf.name}</TableCell>
                <TableCell>
                  {formatCurrency(price)}
                  <Tooltip
                    title={
                      (quotes?.[etf.symbol]?.source ?? etf.source ?? "fallback") === "delayed"
                        ? t("etfs.delayedHint")
                        : (quotes?.[etf.symbol]?.source ?? etf.source ?? "fallback") === "cached"
                        ? t("etfs.cachedHint")
                        : (quotes?.[etf.symbol]?.source ?? etf.source ?? "fallback") === "custom"
                        ? t("etfs.customHint")
                        : t("etfs.fallbackHint")
                    }
                  >
                    <Chip
                      label={quoteSourceLabel(quotes?.[etf.symbol]?.source ?? etf.source ?? "fallback")}
                      size="small"
                      color={
                        quotes?.[etf.symbol]?.source === "live"
                          ? "success"
                          : quotes?.[etf.symbol]?.source === "delayed"
                          ? "info"
                          : quotes?.[etf.symbol]?.source === "cached"
                          ? "primary"
                          : etf.source === "custom"
                          ? "warning"
                          : "default"
                      }
                      sx={{ ml: 1, height: 18, fontSize: "0.6rem" }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>{terValue > 0 ? `${terValue}%` : t("common.dash")}</TableCell>
                <TableCell>
                  {riskEntry ? (
                    <Tooltip
                      title={t("etfs.riskTooltip", {
                        level: riskEntry.riskLevel,
                        vola: riskEntry.volatilityPct,
                        drawdown: riskEntry.drawdownPct,
                        days: riskEntry.sampleDays
                      })}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 180 }}>
                        <Box
                          sx={{
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: riskTone.trackColor,
                            overflow: "hidden"
                          }}
                        >
                          <Box
                            sx={{
                              width: `${riskScore}%`,
                              height: "100%",
                              backgroundColor: riskTone.barColor
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color={riskTone.textColor} sx={{ fontWeight: 700 }}>
                          {t("etfs.riskScore", { level: riskEntry.riskLevel, score: riskScore })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t("etfs.riskCaption", { vola: riskEntry.volatilityPct, drawdown: riskEntry.drawdownPct })}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color={riskStatus === "error" ? "error.main" : "text.secondary"}>
                      {riskStatus === "error"
                        ? t("etfs.unavailable")
                        : t("etfs.noHistory")}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 1, step: 1 }}
                    value={quantities[etf.symbol] || ""}
                    onChange={(event) =>
                      setQuantities((prev) => ({ ...prev, [etf.symbol]: event.target.value }))
                    }
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell>{formatCurrency(rowTotal)}</TableCell>
                <TableCell>{formatDateTime(selectedAddedAt?.[etf.symbol])}</TableCell>
                <TableCell>
                  <Button variant="contained" onClick={() => handleBuy(etf.symbol)} disabled={buyDisabled}>
                    {t("etfs.buyAction")}
                  </Button>
                </TableCell>
                <TableCell>
                  <Tooltip
                    title={
                      (state?.holdings?.[etf.symbol]?.shares || 0) > 0
                        ? t("etfs.removeHeld")
                        : selectedSymbols.length <= 1
                        ? t("etfs.removeLast")
                        : t("etfs.removeConfirm", { symbol: etf.symbol })
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveEtf(etf.symbol)}
                        disabled={(state?.holdings?.[etf.symbol]?.shares || 0) > 0 || selectedSymbols.length <= 1}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          width: 30,
                          height: 30
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </TableContainer>

      <Dialog
        open={Boolean(removeDialogSymbol)}
        onClose={handleCloseRemoveDialog}
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
        <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>{t("etfs.removeTitle")}</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <DialogContentText sx={{ color: "text.primary" }}>
            {t("etfs.removeBody", { symbol: removeDialogSymbol })}
          </DialogContentText>
          <DialogContentText sx={{ mt: 1, color: "text.secondary", fontSize: "0.9rem" }}>
            {t("etfs.removeHint")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={handleCloseRemoveDialog} variant="outlined">
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirmRemoveEtf} color="error" variant="contained">
            {t("etfs.removeAction")}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
