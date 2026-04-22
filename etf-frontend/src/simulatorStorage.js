import { apiGet } from "./apiClient";

const STORAGE_KEY = "etfSimulatorStateV1";
const STORAGE_KEY_PREFIX_V2 = "etfSimulatorStateV2:";
const SESSION_USERNAME_KEY = "sessionUsername";
const ETF_SELECTION_KEY_PREFIX = "etfSelectionV1:";
const CUSTOM_ETF_KEY_PREFIX = "customEtfCatalogV1:";

export const ETF_CATALOG = [
  { symbol: "VWCE", name: "Vanguard FTSE All-World UCITS ETF", price: 116.2, ter: 0.22 },
  { symbol: "EUNL", name: "iShares Core MSCI World UCITS ETF", price: 89.45, ter: 0.2 },
  { symbol: "EMIM", name: "iShares Core MSCI EM IMI UCITS ETF", price: 33.8, ter: 0.18 },
  { symbol: "SXR8", name: "iShares Core S&P 500 UCITS ETF", price: 520.9, ter: 0.07 },
  { symbol: "EXSA", name: "iShares STOXX Europe 600 UCITS ETF", price: 50.4, ter: 0.2 },
  { symbol: "SPYD", name: "SPDR S&P U.S. Dividend Aristocrats", price: 62.7, ter: 0.35 },
  { symbol: "IUSN", name: "iShares MSCI World Small Cap UCITS ETF", price: 54.2, ter: 0.35 },
  { symbol: "CSPX", name: "iShares Core S&P 500 UCITS ETF (USD)", price: 560.1, ter: 0.07 },
  { symbol: "VUSA", name: "Vanguard S&P 500 UCITS ETF", price: 95.8, ter: 0.07 },
  { symbol: "XDAX", name: "Xtrackers DAX UCITS ETF", price: 189.4, ter: 0.09 },
  { symbol: "IMEU", name: "iShares Core MSCI Europe UCITS ETF", price: 31.6, ter: 0.12 },
  { symbol: "EIMI", name: "iShares Core MSCI Emerging Markets IMI ETF", price: 35.7, ter: 0.18 }
];

export const DEFAULT_ETF_SYMBOLS = ["VWCE", "EUNL", "EMIM", "SXR8", "EXSA", "SPYD"];
const DEFAULT_ETF_SYMBOL_SET = new Set(ETF_CATALOG.map((etf) => etf.symbol));

function createInitialState() {
  return {
    cash: 10000,
    holdings: {},
    transactions: []
  };
}

function parseState(raw) {
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw);
  if (
    typeof parsed.cash !== "number" ||
    parsed.holdings === null ||
    typeof parsed.holdings !== "object" ||
    !Array.isArray(parsed.transactions)
  ) {
    return null;
  }

  return parsed;
}

function getStorageKey() {
  const username = localStorage.getItem(SESSION_USERNAME_KEY);
  if (username && username.trim()) {
    return `${STORAGE_KEY_PREFIX_V2}${username.trim().toLowerCase()}`;
  }
  return STORAGE_KEY;
}

function getSelectionKey() {
  const username = localStorage.getItem(SESSION_USERNAME_KEY);
  if (username && username.trim()) {
    return `${ETF_SELECTION_KEY_PREFIX}${username.trim().toLowerCase()}`;
  }
  return `${ETF_SELECTION_KEY_PREFIX}guest`;
}

function getCustomEtfKey() {
  const username = localStorage.getItem(SESSION_USERNAME_KEY);
  if (username && username.trim()) {
    return `${CUSTOM_ETF_KEY_PREFIX}${username.trim().toLowerCase()}`;
  }
  return `${CUSTOM_ETF_KEY_PREFIX}guest`;
}

export function loadCustomEtfs() {
  try {
    const raw = localStorage.getItem(getCustomEtfKey());
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item.symbol === "string" && typeof item.name === "string")
      .map((item) => ({
        symbol: item.symbol.toUpperCase(),
        name: item.name,
        price: Number.isFinite(item.price) ? item.price : 0,
        ter: Number.isFinite(item.ter) ? item.ter : 0
      }));
  } catch (_error) {
    return [];
  }
}

export function saveCustomEtfs(customEtfs) {
  const sanitized = customEtfs
    .filter((item) => item && typeof item.symbol === "string" && typeof item.name === "string")
    .map((item) => ({
      symbol: item.symbol.toUpperCase(),
      name: item.name,
      price: Number.isFinite(item.price) ? item.price : 0,
      ter: Number.isFinite(item.ter) ? item.ter : 0
    }));

  localStorage.setItem(getCustomEtfKey(), JSON.stringify(sanitized));
}

export function loadSelectedEtfSymbols() {
  try {
    const raw = localStorage.getItem(getSelectionKey());
    if (!raw) {
      return DEFAULT_ETF_SYMBOLS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_ETF_SYMBOLS;
    }

    const validCatalogSymbols = new Set([
      ...ETF_CATALOG.map((etf) => etf.symbol),
      ...loadCustomEtfs().map((etf) => etf.symbol)
    ]);

    const validSymbols = parsed.filter(
      (symbol) => typeof symbol === "string" && validCatalogSymbols.has(symbol)
    );

    return validSymbols.length > 0 ? validSymbols : DEFAULT_ETF_SYMBOLS;
  } catch (_error) {
    return DEFAULT_ETF_SYMBOLS;
  }
}

export function saveSelectedEtfSymbols(symbols) {
  const validCatalogSymbols = new Set([
    ...ETF_CATALOG.map((etf) => etf.symbol),
    ...loadCustomEtfs().map((etf) => etf.symbol)
  ]);

  const sanitized = symbols.filter((symbol) => validCatalogSymbols.has(symbol));
  localStorage.setItem(getSelectionKey(), JSON.stringify(sanitized));
}

export function loadSimulatorState() {
  try {
    const key = getStorageKey();
    const primaryState = parseState(localStorage.getItem(key));
    if (primaryState) {
      return primaryState;
    }

    // Backward compatibility: migrate legacy state to the user-scoped key when possible.
    const legacyState = parseState(localStorage.getItem(STORAGE_KEY));
    if (legacyState) {
      if (key !== STORAGE_KEY) {
        localStorage.setItem(key, JSON.stringify(legacyState));
      }
      return legacyState;
    }

    return createInitialState();
  } catch (error) {
    return createInitialState();
  }
}

export function saveSimulatorState(state) {
  localStorage.setItem(getStorageKey(), JSON.stringify(state));
}

function findEtf(symbol) {
  const custom = loadCustomEtfs();
  return [...ETF_CATALOG, ...custom].find((item) => item.symbol === symbol);
}

export async function searchEtfPool(query, limit = 15) {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
    const data = await apiGet(`/api/market/pool?${params.toString()}`, {
      fallbackMessage: "ETF-Pool konnte nicht geladen werden."
    });
    return Array.isArray(data) ? data : [];
  } catch (_error) {
    return [];
  }
}

export async function fetchLivePrices(forceRefresh = false, symbols = null) {
  try {
    const params = new URLSearchParams();
    if (forceRefresh) {
      params.set("force", "true");
    }
    if (Array.isArray(symbols) && symbols.length > 0) {
      params.set("symbols", symbols.join(","));
    }
    const query = params.toString();
    const data = await apiGet(query ? `/api/market/quotes?${query}` : "/api/market/quotes", {
      fallbackMessage: "Kurse konnten nicht geladen werden."
    });
    return data;
  } catch (e) {
    return null;
  }
}

function requireValidQuantity(quantity) {
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error("Bitte eine gueltige ganze Anzahl eingeben.");
  }
}

export function buyEtf(state, symbol, quantity, priceOverride = null) {
  requireValidQuantity(quantity);

  const etf = findEtf(symbol);

  if (!etf) {
    throw new Error("ETF nicht gefunden.");
  }

  const price = priceOverride !== null ? priceOverride : etf.price;
  const total = price * quantity;

  if (state.cash < total) {
    throw new Error("Nicht genug Spielgeld vorhanden.");
  }

  const existing = state.holdings[symbol] || { shares: 0, costTotal: 0 };

  return {
    ...state,
    cash: Number((state.cash - total).toFixed(2)),
    holdings: {
      ...state.holdings,
      [symbol]: {
        shares: existing.shares + quantity,
        costTotal: Number((existing.costTotal + total).toFixed(2))
      }
    },
    transactions: [
      {
        id: Date.now(),
        type: "BUY",
        symbol,
        quantity,
        price,
        total: Number(total.toFixed(2)),
        timestamp: new Date().toISOString()
      },
      ...state.transactions
    ]
  };
}

export function sellEtf(state, symbol, quantity, priceOverride = null) {
  requireValidQuantity(quantity);

  const etf = findEtf(symbol);

  if (!etf) {
    throw new Error("ETF nicht gefunden.");
  }

  const existing = state.holdings[symbol];

  if (!existing || existing.shares < quantity) {
    throw new Error("Nicht genug Anteile zum Verkaufen.");
  }

  const price = priceOverride !== null ? priceOverride : etf.price;
  const proceeds = price * quantity;
  const averageCost = existing.costTotal / existing.shares;
  const costPart = averageCost * quantity;
  const realizedProfit = proceeds - costPart;

  const remainingShares = existing.shares - quantity;
  const remainingCost = Number((existing.costTotal - costPart).toFixed(2));

  const nextHoldings = { ...state.holdings };

  if (remainingShares === 0) {
    delete nextHoldings[symbol];
  } else {
    nextHoldings[symbol] = {
      shares: remainingShares,
      costTotal: remainingCost
    };
  }

  return {
    ...state,
    cash: Number((state.cash + proceeds).toFixed(2)),
    holdings: nextHoldings,
    transactions: [
      {
        id: Date.now(),
        type: "SELL",
        symbol,
        quantity,
        price,
        total: Number(proceeds.toFixed(2)),
        realizedProfit: Number(realizedProfit.toFixed(2)),
        timestamp: new Date().toISOString()
      },
      ...state.transactions
    ]
  };
}

export function calculateMetrics(state, livePrices = null, options = {}) {
  const allowCatalogFallback = options.allowCatalogFallback ?? true;

  const positions = Object.entries(state.holdings).map(([symbol, holding]) => {
    const etf = findEtf(symbol);
    const hasLivePrice = livePrices && livePrices[symbol] != null;
    const isCustomEtf = Boolean(etf) && !DEFAULT_ETF_SYMBOL_SET.has(symbol);

    let currentPrice = null;
    if (hasLivePrice) {
      currentPrice = livePrices[symbol];
    } else if (etf && (livePrices == null || allowCatalogFallback || isCustomEtf)) {
      currentPrice = etf.price;
    }

    const currentValue = currentPrice == null ? 0 : currentPrice * holding.shares;
    const averageCost = holding.shares > 0 ? holding.costTotal / holding.shares : 0;
    const pnlAbs = currentPrice == null ? null : currentValue - holding.costTotal;
    const pnlPct = currentPrice == null || holding.costTotal <= 0 ? null : (pnlAbs / holding.costTotal) * 100;

    return {
      symbol,
      name: etf ? etf.name : symbol,
      shares: holding.shares,
      addedAt: holding.addedAt || null,
      averageCost,
      currentPrice,
      costTotal: holding.costTotal,
      currentValue,
      pnlAbs,
      pnlPct
    };
  });

  const investedValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const costBasis = positions.reduce((sum, p) => sum + p.costTotal, 0);
  const unrealizedPnl = investedValue - costBasis;
  const realizedPnl = state.transactions
    .filter((tx) => tx.type === "SELL")
    .reduce((sum, tx) => sum + (tx.realizedProfit || 0), 0);

  const totalFees = state.transactions
    .reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0);

  return {
    cash: state.cash,
    investedValue,
    totalValue: state.cash + investedValue,
    etfCount: positions.length,
    costBasis,
    unrealizedPnl,
    realizedPnl,
    totalPnl: unrealizedPnl + realizedPnl,
    totalFees,
    positions
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
