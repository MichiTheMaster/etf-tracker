import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
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
  fetchLivePrices,
  formatCurrency,
  formatPercent,
  loadCustomEtfs
} from "./simulatorStorage";
import { PortfolioAPI } from "./portfolioAPI";

const AUTO_REFRESH_SECONDS = 60;
const READY_QUOTE_SOURCES = new Set(["live", "cached"]);

function calculateBenchmarkReturnPct(annualRatePct, holdingDays) {
  const normalizedAnnualRatePct = Number(annualRatePct);
  const normalizedHoldingDays = Math.max(0, Math.floor(Number(holdingDays) || 0));

  if (!Number.isFinite(normalizedAnnualRatePct) || normalizedAnnualRatePct < 0) {
    return null;
  }

  const dailyRate = (normalizedAnnualRatePct / 100) / 365;
  return (Math.pow(1 + dailyRate, normalizedHoldingDays) - 1) * 100;
}

function hasValidQuoteCoverage(quoteData, symbols, customSymbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return false;
  }

  return symbols.every((symbol) => {
    if (customSymbols.has(symbol)) {
      return true;
    }

    const price = quoteData?.[symbol]?.price;
    const source = String(quoteData?.[symbol]?.source || "").toLowerCase();
    return Number.isFinite(price) && price > 0 && READY_QUOTE_SOURCES.has(source);
  });
}

export default function Portfolio() {
  const [state, setState] = useState(null);
  const [sellQuantities, setSellQuantities] = useState({});
  const [error, setError] = useState("");
  const [quotes, setQuotes] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const [benchmarkAnnualRatePct, setBenchmarkAnnualRatePct] = useState(3);
  const [sortConfig, setSortConfig] = useState({ field: "symbol", direction: "asc" });
  const isRefreshingRef = useRef(false);

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
        const [portfolioState, benchmarkSettings] = await Promise.all([
          PortfolioAPI.load(),
          fetchPortfolioBenchmarkSettings()
        ]);
        setState(portfolioState);
        setBenchmarkAnnualRatePct(Number(benchmarkSettings?.annualRatePct || 3));
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
        setError(err?.message || "Portfolio konnte nicht geladen werden.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPortfolio();
  }, []);

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
      setCountdown(AUTO_REFRESH_SECONDS);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      let data = await fetchLivePrices(forceRefresh, symbolsToRefresh);

      // Some providers return transient zero/missing prices right after page load.
      // Auto-retry once with force=true to mirror manual refresh behavior.
      if (!hasValidQuoteCoverage(data, symbolsToRefresh, customSymbols)) {
        const retryData = await fetchLivePrices(true, symbolsToRefresh);
        if (retryData) {
          data = retryData;
        }
      }

      if (data && Object.keys(data).length > 0) {
        setQuotes(data);
      }
      setCountdown(AUTO_REFRESH_SECONDS);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [state, customSymbols]);

  useEffect(() => {
    if (!state) {
      return;
    }
    // If we already have initial quotes (loaded during mount), skip immediate refresh.
    if (quotes && Object.keys(quotes).length > 0) {
      return;
    }
    refreshQuotes(true);
  }, [state, refreshQuotes]);

  useEffect(() => {
    if (isRefreshing) {
      return;
    }

    if (countdown <= 0) {
      refreshQuotes(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!document.hidden) {
        setCountdown((previous) => Math.max(previous - 1, 0));
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [countdown, isRefreshing, refreshQuotes]);

  const trustedPriceMap = quotes
    ? Object.fromEntries(
        Object.entries(quotes)
          .filter(([symbol, quote]) => {
            if (customSymbols.has(symbol)) {
              return true;
            }

            const source = String(quote?.source || "").toLowerCase();
            return READY_QUOTE_SOURCES.has(source);
          })
          .map(([symbol, quote]) => [symbol, quote.price])
      )
    : {};

  const metrics = state ? calculateMetrics(state, trustedPriceMap, { allowCatalogFallback: false }) : null;
  const hasCashDeficit = Number(metrics?.cash || 0) < 0;
  const cashDeficitAmount = hasCashDeficit ? Math.abs(Number(metrics?.cash || 0)) : 0;
  const quotesReady = hasValidQuoteCoverage(quotes, Object.keys(state?.holdings || {}), customSymbols);
  const hasHoldings = metrics ? metrics.positions.length > 0 : false;
  const shouldShowLivePortfolioValues = !hasHoldings || quotesReady;

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
        position.pnlPct == null
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

  const handleSell = async (symbol) => {
    const quantity = Number(sellQuantities[symbol] || 0);
    const livePrice = quotes?.[symbol]?.price ?? null;

    try {
      const nextState = await PortfolioAPI.sell(symbol, quantity, livePrice);
      setState(nextState);
      setError("");
      setSellQuantities((prev) => ({ ...prev, [symbol]: "" }));
    } catch (sellError) {
      setError(sellError.message);
    }
  };

  const handleSaveFees = async () => {
    setFeeError("");
    setFeeSaved(false);
    const txRate = Number.parseFloat(feeTransactionPct) / 100;
    const depotRate = Number.parseFloat(feeDepotPct) / 100;
    if (Number.isNaN(txRate) || txRate < 0 || txRate > 0.1) {
      setFeeError("Transaktionsgebühr muss zwischen 0 und 10 % liegen.");
      return;
    }
    if (Number.isNaN(depotRate) || depotRate < 0 || depotRate > 0.1) {
      setFeeError("Depotgebühr muss zwischen 0 und 10 % p.a. liegen.");
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

  const formatAddedAt = (value) => {
    if (!value) {
      return "-";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "-";
    }
    return parsed.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography>Portfolio wird geladen...</Typography>
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
            <Typography color="error">Portfolio konnte nicht geladen werden.</Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  }

  const summaryCards = [
    {
      title: "Gesamtwert",
      value: shouldShowLivePortfolioValues ? formatCurrency(metrics.totalValue) : "Lädt...",
      tooltip: "Der Gesamtwert ist die Summe aus aktuellem Cash-Bestand und dem aktuellen Marktwert aller gehaltenen ETF-Positionen. Er zeigt damit den kompletten Depotstand zum jetzigen Zeitpunkt.",
      color: "text.primary"
    },
    {
      title: "Cash",
      value: formatCurrency(metrics.cash),
      detail: hasCashDeficit ? "Unterdeckung im Cash-Konto" : "",
      detailColor: "error.main",
      tooltip: hasCashDeficit
        ? "Cash zeigt den aktuellen Kontostand des Cash-Kontos (Verrechnungskontos). Wenn dieser unter null liegt, besteht eine Unterdeckung. Rechnerisch ergibt sich der Wert aus Startkapital minus Kaeufe minus Kaufgebuehren plus Verkaeufe minus Verkaufsgebuehren minus Depotgebuehren."
        : "Cash zeigt den aktuell verfuegbaren Restbetrag auf dem Cash-Konto (Verrechnungskonto). Rechnerisch ergibt sich der Wert aus Startkapital minus Kaeufe minus Kaufgebuehren plus Verkaeufe minus Verkaufsgebuehren minus Depotgebuehren.",
      color: hasCashDeficit ? "error.main" : "text.primary"
    },
    {
      title: "Unrealized P/L",
      value: shouldShowLivePortfolioValues ? formatCurrency(metrics.unrealizedPnl) : "Lädt...",
      tooltip: "Dieser Wert zeigt den aktuellen Buchgewinn oder Buchverlust deiner noch gehaltenen Positionen. Er vergleicht heutigen Marktwert mit dem jeweiligen Einstandswert, ohne bereits verkaufte Positionen einzubeziehen.",
      color: metrics.unrealizedPnl >= 0 ? "success.main" : "error.main"
    },
    {
      title: "Rendite",
      value: formatPercent(metrics.returns.totalReturnPct),
      tooltip: "Die Rendite zeigt die bisherige prozentuale Entwicklung des Portfolios seit Start. Sie ist nicht annualisiert und entspricht damit der direkten Gesamtentwicklung in Prozent.",
      color: metrics.returns.totalReturnPct >= 0 ? "success.main" : "error.main"
    },
    {
      title: "Unterdeckung",
      value: formatCurrency(cashDeficitAmount),
      detail: hasCashDeficit ? "Ausgleich des Cash-Kontos erforderlich" : "",
      detailColor: hasCashDeficit ? "error.main" : "text.secondary",
      tooltip: hasCashDeficit
        ? "Eine Unterdeckung liegt vor, wenn das Cash-Konto (Verrechnungskonto) unter null gefallen ist. Der hier angezeigte Betrag entspricht genau dem Fehlbetrag, der rechnerisch ausgeglichen werden muesste."
        : "Solange hier 0,00 EUR steht, besteht keine Unterdeckung. Das Cash-Konto ist dann nicht im Minus und es muss nichts nachgeschossen werden.",
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
          Negativer Cash-Saldo: Das Verrechnungskonto ist in Unterdeckung und sollte ausgeglichen werden.
        </Alert>
      )}
      <Grid container spacing={3}>
        {summaryCards.map(renderSummaryCard)}
      </Grid>

      <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Portfolio Uebersicht
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => refreshQuotes(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Aktualisiere..." : "Aktualisieren"}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {isRefreshing
                ? "Auto-Refresh laeuft..."
                : `Naechster Auto-Refresh in ${countdown}s`}
            </Typography>
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

          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5", "&:hover": { backgroundColor: "#f5f5f5" } }}>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "symbol" ? sortConfig.direction : false}>
                  <Tooltip title="Zum Sortieren klicken (auf/absteigend)">
                    <TableSortLabel
                      active={sortConfig.field === "symbol"}
                      direction={sortConfig.field === "symbol" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("symbol")}
                    >
                      Symbol
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "shares" ? sortConfig.direction : false}>
                  <Tooltip title="Zum Sortieren klicken (auf/absteigend)">
                    <TableSortLabel
                      active={sortConfig.field === "shares"}
                      direction={sortConfig.field === "shares" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("shares")}
                    >
                      Anteile
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "averageCost" ? sortConfig.direction : false}>
                  <Tooltip title="Zum Sortieren klicken (auf/absteigend)">
                    <TableSortLabel
                      active={sortConfig.field === "averageCost"}
                      direction={sortConfig.field === "averageCost" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("averageCost")}
                    >
                      Durchschnitt
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "currentPrice" ? sortConfig.direction : false}>
                  <Tooltip title="Zum Sortieren klicken (auf/absteigend)">
                    <TableSortLabel
                      active={sortConfig.field === "currentPrice"}
                      direction={sortConfig.field === "currentPrice" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("currentPrice")}
                    >
                      Aktuell
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "currentValue" ? sortConfig.direction : false}>
                  <Tooltip title="Zum Sortieren klicken (auf/absteigend)">
                    <TableSortLabel
                      active={sortConfig.field === "currentValue"}
                      direction={sortConfig.field === "currentValue" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("currentValue")}
                    >
                      Wert
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "pnl" ? sortConfig.direction : false}>
                  <Tooltip title="Zum Sortieren klicken (auf/absteigend)">
                    <TableSortLabel
                      active={sortConfig.field === "pnl"}
                      direction={sortConfig.field === "pnl" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("pnl")}
                    >
                      P/L
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "benchmarkReturn" ? sortConfig.direction : false}>
                  <Tooltip title={`Benchmark-Wert nach Formel (1 + ${(benchmarkAnnualRatePct / 100).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}/365)^Tage - 1. Zum Sortieren klicken.`}>
                    <TableSortLabel
                      active={sortConfig.field === "benchmarkReturn"}
                      direction={sortConfig.field === "benchmarkReturn" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("benchmarkReturn")}
                    >
                      Benchmark
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "outperformance" ? sortConfig.direction : false}>
                  <Tooltip title="Performance = aktuelle ETF-Rendite in % minus Benchmark. Positive Werte bedeuten, dass die Position im bisherigen Haltedauer-Zeitraum besser als der Benchmark gelaufen ist.">
                    <TableSortLabel
                      active={sortConfig.field === "outperformance"}
                      direction={sortConfig.field === "outperformance" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("outperformance")}
                    >
                      Performance
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>Hinzugefuegt</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>Verkauf</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPositions.map((position) => (
                <TableRow key={position.symbol}>
                  <TableCell>{position.symbol}</TableCell>
                  <TableCell>{position.shares}</TableCell>
                  <TableCell>{formatCurrency(position.averageCost)}</TableCell>
                  <TableCell>{quotesReady ? formatCurrency(position.currentPrice) : "Lädt..."}</TableCell>
                  <TableCell>{quotesReady ? formatCurrency(position.currentValue) : "Lädt..."}</TableCell>
                  <TableCell
                    sx={{ color: quotesReady && position.pnlAbs >= 0 ? "success.main" : "error.main" }}
                  >
                    {quotesReady ? `${formatCurrency(position.pnlAbs)} (${formatPercent(position.pnlPct)})` : "Lädt..."}
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
                    {formatPercent(position.outperformancePct)}
                  </TableCell>
                  <TableCell>{formatAddedAt(position.addedAt)}</TableCell>
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
                      Sell
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {metrics.positions.length === 0 && (
            <Typography sx={{ mt: 2 }} color="text.secondary">
              Noch keine ETF Positionen. Starte in der ETF Liste mit deinem ersten Kauf.
            </Typography>
          )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Nebenkosten-Einstellungen
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Transaktionsgebühren werden direkt beim Kauf/Verkauf vom Cash abgezogen.
          Depotgebühren werden monatlich automatisch berechnet (anteilig p.a.) und koennen einen negativen Cash-Saldo verursachen.
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end", flexWrap: "wrap" }}>
          <TextField
            label="Transaktionsgebühr (%)"
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 10, step: 0.01 } }}
            value={feeTransactionPct}
            onChange={(e) => { setFeeTransactionPct(e.target.value); setFeeSaved(false); }}
            sx={{ width: 200 }}
            helperText="z. B. 0.1 für 0,1 % pro Trade"
          />
          <TextField
            label="Depotgebühr p.a. (%)"
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 10, step: 0.01 } }}
            value={feeDepotPct}
            onChange={(e) => { setFeeDepotPct(e.target.value); setFeeSaved(false); }}
            sx={{ width: 200 }}
            helperText="z. B. 0.1 für 0,1 % p.a."
          />
          <Button variant="contained" onClick={handleSaveFees}>
            Speichern
          </Button>
        </Box>
        {feeError && (
          <Alert severity="error" sx={{ mt: 2 }}>{feeError}</Alert>
        )}
        {feeSaved && (
          <Alert severity="success" sx={{ mt: 2 }}>Gebühren gespeichert.</Alert>
        )}
      </Paper>
    </Box>
  );
}
