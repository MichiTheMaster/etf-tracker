/**
 * API service for portfolio operations
 * Fetches/saves portfolio state to/from backend instead of localStorage
 */

import { API_BASE } from "./apiBase";

const PORTFOLIO_API_BASE = `${API_BASE}/api/portfolio`;

export const PortfolioAPI = {
  /**
   * Load portfolio state from backend
   */
  async load() {
    try {
      const response = await fetch(`${PORTFOLIO_API_BASE}/load`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        let details = "";
        try {
          const data = await response.json();
          details = data?.error || "";
        } catch (_ignored) {
          details = "";
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error("Nicht angemeldet. Bitte erneut einloggen.");
        }

        throw new Error(details || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to load portfolio:", error);
      throw error;
    }
  },

  /**
   * Buy ETF - sends request to backend
   */
  async buy(symbol, quantity, price) {
    try {
      const response = await fetch(`${PORTFOLIO_API_BASE}/buy`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity, price: price.toString() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to buy ETF:", error);
      throw error;
    }
  },

  /**
   * Sell ETF - sends request to backend
   */
  async sell(symbol, quantity, price) {
    try {
      const response = await fetch(`${PORTFOLIO_API_BASE}/sell`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity, price: price.toString() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to sell ETF:", error);
      throw error;
    }
  },

  async loadEtfPreferences() {
    try {
      const response = await fetch(`${PORTFOLIO_API_BASE}/etfs`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Nicht angemeldet. Bitte erneut einloggen.");
        }
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to load ETF preferences:", error);
      throw error;
    }
  },

  async saveEtfPreferences(selectedSymbols, customEtfs) {
    try {
      const response = await fetch(`${PORTFOLIO_API_BASE}/etfs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSymbols, customEtfs })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to save ETF preferences:", error);
      throw error;
    }
  }
};
