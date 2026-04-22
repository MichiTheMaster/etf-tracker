import { apiGet, apiPost, apiPut } from "./apiClient";

const PORTFOLIO_API_BASE = "/api/portfolio";

function normalizeTradePayload(symbol, quantity, price) {
  const normalizedSymbol = typeof symbol === "string" ? symbol.trim().toUpperCase() : "";
  const normalizedQuantity = Number(quantity);
  const normalizedPrice = Number(price);

  if (!normalizedSymbol) {
    throw new Error("ETF-Symbol ist erforderlich.");
  }

  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new Error("Ungueltige Anzahl.");
  }

  if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    throw new Error("Ungueltiger Preis.");
  }

  return {
    symbol: normalizedSymbol,
    quantity: normalizedQuantity,
    price: normalizedPrice.toString()
  };
}

export const PortfolioAPI = {
  async load() {
    try {
      return await apiGet(`${PORTFOLIO_API_BASE}/load`, {
        fallbackMessage: "Portfolio konnte nicht geladen werden."
      });
    } catch (error) {
      console.error("Failed to load portfolio:", error);
      throw error;
    }
  },

  async buy(symbol, quantity, price) {
    try {
      return await apiPost(
        `${PORTFOLIO_API_BASE}/buy`,
        normalizeTradePayload(symbol, quantity, price),
        { fallbackMessage: "ETF-Kauf fehlgeschlagen." }
      );
    } catch (error) {
      console.error("Failed to buy ETF:", error);
      throw error;
    }
  },

  async sell(symbol, quantity, price) {
    try {
      return await apiPost(
        `${PORTFOLIO_API_BASE}/sell`,
        normalizeTradePayload(symbol, quantity, price),
        { fallbackMessage: "ETF-Verkauf fehlgeschlagen." }
      );
    } catch (error) {
      console.error("Failed to sell ETF:", error);
      throw error;
    }
  },

  async loadEtfPreferences() {
    try {
      return await apiGet(`${PORTFOLIO_API_BASE}/etfs`, {
        fallbackMessage: "ETF-Auswahl konnte nicht geladen werden."
      });
    } catch (error) {
      console.error("Failed to load ETF preferences:", error);
      throw error;
    }
  },

  async saveEtfPreferences(selectedSymbols, customEtfs) {
    try {
      return await apiPost(
        `${PORTFOLIO_API_BASE}/etfs`,
        { selectedSymbols, customEtfs },
        { fallbackMessage: "ETF-Auswahl konnte nicht gespeichert werden." }
      );
    } catch (error) {
      console.error("Failed to save ETF preferences:", error);
      throw error;
    }
  },

  async updateFeeSettings(transactionFeeRate, depotFeeRate) {
    try {
      return await apiPut(
        `${PORTFOLIO_API_BASE}/fees`,
        { transactionFeeRate, depotFeeRate },
        { fallbackMessage: "Gebuehren konnten nicht aktualisiert werden." }
      );
    } catch (error) {
      console.error("Failed to update fee settings:", error);
      throw error;
    }
  }
};
