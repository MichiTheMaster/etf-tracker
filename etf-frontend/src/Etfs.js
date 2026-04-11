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
  fetchLivePrices,
  formatCurrency,
  searchEtfPool
} from "./simulatorStorage";
import { PortfolioAPI } from "./portfolioAPI";

const AUTO_REFRESH_SECONDS = 60;
const MIN_POOL_QUERY_LENGTH = 1;
const MAX_POOL_RESULTS = 20;

const ETF_ISIN_BY_SYMBOL = {
  VWCE: "IE00BK5BQT80",
  EUNL: "IE00B4L5Y983",
  EMIM: "IE00BKM4GZ66",
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
  const [state, setState] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");
  const [quotes, setQuotes] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);
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
        setError(err?.message || "Portfolio konnte nicht geladen werden.");
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
      setError(persistError?.message || "ETF-Auswahl konnte nicht gespeichert werden.");
      throw persistError;
    }
  }, []);

  const formatAddedAt = useCallback((value) => {
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
  }, []);

  const refreshQuotes = useCallback(async (forceRefresh) => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const symbols = visibleEtfs.map((etf) => etf.symbol);
      const data = await fetchLivePrices(forceRefresh, symbols);
      if (data) {
        setQuotes(data);
      }
      setCountdown(AUTO_REFRESH_SECONDS);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [visibleEtfs]);

  useEffect(() => {
    refreshQuotes(false);
  }, [refreshQuotes]);

  useEffect(() => {
    if (isRefreshing) {
      return;
    }

    if (countdown <= 0) {
      refreshQuotes(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!document.hidden) {
        setCountdown((previous) => Math.max(previous - 1, 0));
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [countdown, isRefreshing, refreshQuotes]);

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
        [symbol]: { symbol, price: initialPoolPrice, source: "live" }
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
      setError("ETF kann nicht entfernt werden, solange Anteile im Portfolio vorhanden sind.");
      return;
    }

    if (selectedSymbols.length <= 1) {
      setError("Mindestens ein ETF muss in der Liste verbleiben.");
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
    return <Paper sx={{ p: 3 }}><Typography>Portfolio wird geladen...</Typography></Paper>;
  }

  if (!state) {
    return <Paper sx={{ p: 3 }}><Typography color="error">Portfolio konnte nicht geladen werden.</Typography></Paper>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography
        variant="h4"
        sx={{
          mb: 0.5,
          fontWeight: 800,
          letterSpacing: "0.01em"
        }}
      >
        ETF Liste
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Spielgeld verfuegbar: {formatCurrency(state.cash)} | Nach Eingabe: {formatCurrency(remainingCashAfterInput)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        Zeilen mit gruenem Hintergrund enthalten ETFs, die bereits im Portfolio gehalten werden.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 2 }}>
        <Autocomplete
          size="small"
          sx={{ minWidth: 360, maxWidth: 760 }}
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
            return `${option.symbol || "-"} - ${option.name || ""}`;
          }}
          isOptionEqualToValue={(option, value) => option.symbol === value.symbol}
          noOptionsText={
            !poolQuery.trim() || poolQuery.trim().length < MIN_POOL_QUERY_LENGTH
              ? "Mindestens 1 Zeichen eingeben"
              : "Keine ETFs gefunden"
          }
          renderOption={(props, option) => {
            const symbol = option.symbol?.toUpperCase() || "-";
            return (
              <Box component="li" {...props} key={`${symbol}-${option.exchange || "-"}`}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {symbol} - {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.exchange || "-"} | {option.currency || "-"}
                  </Typography>
                </Box>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="ETF im oeffentlichen Pool suchen"
              placeholder="z. B. iShares MSCI World"
              helperText={
                poolQuery.trim().length > 0 && poolQuery.trim().length < MIN_POOL_QUERY_LENGTH
                  ? "Bitte mindestens 1 Zeichen eingeben"
                  : "Waehle einen Treffer aus, um ihn zur Liste hinzuzufuegen"
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
          <Tooltip title="UCITS = EU-regulierter Fondsstandard mit einheitlichen Schutzregeln fuer Anleger.">
            <FormControlLabel
              control={<Checkbox size="small" checked={filterUcits} onChange={(e) => setFilterUcits(e.target.checked)} />}
              label="Nur UCITS"
            />
          </Tooltip>
          <Tooltip title="Zeigt nur ETFs, die in Euro notieren.">
            <FormControlLabel
              control={<Checkbox size="small" checked={filterEur} onChange={(e) => setFilterEur(e.target.checked)} />}
              label="Nur EUR"
            />
          </Tooltip>
          <Tooltip title="Filtert auf Boersenplaetze XETRA/FRA (Frankfurt).">
            <FormControlLabel
              control={<Checkbox size="small" checked={filterXetra} onChange={(e) => setFilterXetra(e.target.checked)} />}
              label="Nur XETRA/FRA"
            />
          </Tooltip>
        </Box>

        {poolQuery.trim() && poolDisplayResults.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {poolDisplayResults.length} Treffer. Auswahl ueber das Suchfeld.
          </Typography>
        )}
      </Box>

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
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>ISIN</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "name" ? sortConfig.direction : false}>
              <Tooltip title="Zum Sortieren klicken (auf/absteigend)">
                <TableSortLabel
                  active={sortConfig.field === "name"}
                  direction={sortConfig.field === "name" ? sortConfig.direction : "asc"}
                  onClick={() => handleSort("name")}
                >
                  Name
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }} sortDirection={sortConfig.field === "price" ? sortConfig.direction : false}>
              <Tooltip title="Zum Sortieren klicken (auf/absteigend)">
                <TableSortLabel
                  active={sortConfig.field === "price"}
                  direction={sortConfig.field === "price" ? sortConfig.direction : "asc"}
                  onClick={() => handleSort("price")}
                >
                  Preis
                </TableSortLabel>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>
              <Tooltip title="TER (Total Expense Ratio): laufende Fondskosten pro Jahr in %.">
                <span>TER</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>Anzahl</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>Summe</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>Hinzugefuegt</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>Kaufen</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#333", textAlign: "center" }}>
              <Tooltip title="Aus Liste entfernen">
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
            const isin = ETF_ISIN_BY_SYMBOL[etf.symbol] || "-";
            const price = quotePrice > 0 ? quotePrice : etf.price;
            const terValue = quoteTer > 0 ? quoteTer : etf.ter;
            const rowTotal = Number.isFinite(quantity) && quantity > 0 ? quantity * price : 0;
            const buyDisabled = !Number.isInteger(quantity) || quantity <= 0 || rowTotal > state.cash;

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
                      label="im Portfolio"
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
                      (quotes?.[etf.symbol]?.source ?? etf.source ?? "fallback") === "live"
                        ? "Live-Daten vom Kursanbieter"
                        : (quotes?.[etf.symbol]?.source ?? etf.source ?? "fallback") === "cached"
                        ? "Zwischengespeicherter Kurs (kurzzeitig)"
                        : (quotes?.[etf.symbol]?.source ?? etf.source ?? "fallback") === "custom"
                        ? "Manuell hinzugefuegter ETF"
                        : "Fallback-Daten (nicht aktuell)"
                    }
                  >
                    <Chip
                      label={quotes?.[etf.symbol]?.source ?? etf.source ?? "fallback"}
                      size="small"
                      color={
                        quotes?.[etf.symbol]?.source === "live"
                          ? "success"
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
                <TableCell>{terValue > 0 ? `${terValue}%` : "-"}</TableCell>
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
                <TableCell>{formatAddedAt(selectedAddedAt?.[etf.symbol])}</TableCell>
                <TableCell>
                  <Button variant="contained" onClick={() => handleBuy(etf.symbol)} disabled={buyDisabled}>
                    Buy
                  </Button>
                </TableCell>
                <TableCell>
                  <Tooltip
                    title={
                      (state?.holdings?.[etf.symbol]?.shares || 0) > 0
                        ? "Nicht moeglich: ETF ist noch im Portfolio"
                        : selectedSymbols.length <= 1
                        ? "Mindestens ein ETF muss in der Liste bleiben"
                        : `ETF ${etf.symbol} aus der Liste entfernen`
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
        <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>ETF entfernen?</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <DialogContentText sx={{ color: "text.primary" }}>
            Soll der ETF <strong>{removeDialogSymbol}</strong> wirklich aus der Liste genommen werden?
          </DialogContentText>
          <DialogContentText sx={{ mt: 1, color: "text.secondary", fontSize: "0.9rem" }}>
            Diese Aktion entfernt nur den Eintrag aus der ETF-Liste.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={handleCloseRemoveDialog} variant="outlined">
            Abbrechen
          </Button>
          <Button onClick={handleConfirmRemoveEtf} color="error" variant="contained">
            Entfernen
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
