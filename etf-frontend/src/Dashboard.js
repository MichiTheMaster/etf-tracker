import { useEffect, useState } from "react";
import { Alert, Grid, Paper, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { calculateMetrics, fetchLivePrices, formatCurrency, formatPercent } from "./simulatorStorage";
import { PortfolioAPI } from "./portfolioAPI";

export default function Dashboard() {
  const [state, setState] = useState(null);
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const portfolioState = await PortfolioAPI.load();
        setState(portfolioState);

        const symbols = Object.keys(portfolioState?.holdings || {});
        const quoteData = await fetchLivePrices(false, symbols);
        if (quoteData) {
          setQuotes(quoteData);
        }
      } catch (loadError) {
        setError(loadError?.message || "Portfolio konnte nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Uebersicht wird geladen...</Typography>
      </Paper>
    );
  }

  if (!state) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert
          severity="error"
          variant="filled"
          sx={{ borderRadius: 2, boxShadow: "0 10px 24px rgba(198, 40, 40, 0.18)" }}
        >
          {error || "Portfolio konnte nicht geladen werden."}
        </Alert>
      </Paper>
    );
  }

  const priceMap = quotes
    ? Object.fromEntries(Object.entries(quotes).map(([s, q]) => [s, q.price]))
    : null;

  const metrics = calculateMetrics(state, priceMap);
  const cardSx = {
    p: 2,
    display: "block",
    color: "text.primary",
    textDecoration: "none",
    cursor: "pointer",
    border: "1px solid",
    borderColor: "divider",
    transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: 6,
      borderColor: "primary.main"
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper component={Link} to="/portfolio" sx={cardSx}>
          <Typography variant="h6">Portfolio-Wert</Typography>
          <Typography variant="h4">{formatCurrency(metrics.totalValue)}</Typography>
          <Typography variant="body2" color="text.secondary">
            Cash: {formatCurrency(metrics.cash)}
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper component={Link} to="/etfs" sx={cardSx}>
          <Typography variant="h6">Anzahl ETFs</Typography>
          <Typography variant="h4">{metrics.etfCount}</Typography>
          <Typography variant="body2" color="text.secondary">
            Positionen im Depot
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper component={Link} to="/performance" sx={cardSx}>
          <Typography variant="h6">Gesamt-Performance</Typography>
          <Typography variant="h4" color={metrics.totalPnl >= 0 ? "success.main" : "error.main"}>
            {formatCurrency(metrics.totalPnl)}
          </Typography>
          <Typography variant="body2" color={metrics.totalPnl >= 0 ? "success.main" : "error.main"}>
            {formatPercent((metrics.totalPnl / 10000) * 100)} seit Start
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}
