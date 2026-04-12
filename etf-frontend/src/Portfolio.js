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
  fetchLivePrices,
  formatCurrency,
  formatPercent
} from "./simulatorStorage";
import { PortfolioAPI } from "./portfolioAPI";

const AUTO_REFRESH_SECONDS = 60;

function hasValidQuoteCoverage(quoteData, symbols) {
  if (!quoteData || !Array.isArray(symbols) || symbols.length === 0) {
    return false;
  }

  return symbols.every((symbol) => {
    const price = quoteData?.[symbol]?.price;
    return Number.isFinite(price) && price > 0;
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
  const [sortConfig, setSortConfig] = useState({ field: "symbol", direction: "asc" });
  const isRefreshingRef = useRef(false);

  // Load portfolio from API on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const portfolioState = await PortfolioAPI.load();
        setState(portfolioState);
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
      if (!hasValidQuoteCoverage(data, symbolsToRefresh)) {
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
  }, [state]);

  useEffect(() => {
    if (!state) {
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

  const priceMap = quotes
    ? Object.fromEntries(Object.entries(quotes).map(([s, q]) => [s, q.price]))
    : null;

  const metrics = state ? calculateMetrics(state, priceMap) : null;

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
    const normalized = [...metrics.positions];

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
      }

      return 0;
    });

    return normalized;
  }, [metrics, sortConfig]);

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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Gesamtwert
            </Typography>
            <Typography variant="h5">{formatCurrency(metrics.totalValue)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Cash
            </Typography>
            <Typography variant="h5">{formatCurrency(metrics.cash)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Unrealized P/L
            </Typography>
            <Typography variant="h5" color={metrics.unrealizedPnl >= 0 ? "success.main" : "error.main"}>
              {formatCurrency(metrics.unrealizedPnl)}
            </Typography>
          </Paper>
        </Grid>
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
                  <TableCell>{formatCurrency(position.currentPrice)}</TableCell>
                  <TableCell>{formatCurrency(position.currentValue)}</TableCell>
                  <TableCell
                    sx={{ color: position.pnlAbs >= 0 ? "success.main" : "error.main" }}
                  >
                    {formatCurrency(position.pnlAbs)} ({formatPercent(position.pnlPct)})
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
    </Box>
  );
}
