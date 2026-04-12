import { useEffect, useState } from "react";
import { Alert, Box, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { calculateMetrics, fetchLivePrices, formatCurrency } from "./simulatorStorage";
import { PortfolioAPI } from "./portfolioAPI";

export default function Performance() {
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
        setError(loadError?.message || "Performance konnte nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Performance wird geladen...</Typography>
      </Paper>
    );
  }

  if (!state) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error || "Performance konnte nicht geladen werden."}</Alert>
      </Paper>
    );
  }

  const priceMap = quotes
    ? Object.fromEntries(Object.entries(quotes).map(([symbol, quote]) => [symbol, quote.price]))
    : null;

  const metrics = calculateMetrics(state, priceMap);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Realized P/L
            </Typography>
            <Typography variant="h5" color={metrics.realizedPnl >= 0 ? "success.main" : "error.main"}>
              {formatCurrency(metrics.realizedPnl)}
            </Typography>
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
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Gesamt P/L
            </Typography>
            <Typography variant="h5" color={metrics.totalPnl >= 0 ? "success.main" : "error.main"}>
              {formatCurrency(metrics.totalPnl)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Letzte Trades
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Zeit</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Symbol</TableCell>
                <TableCell>Anzahl</TableCell>
                <TableCell>Preis</TableCell>
                <TableCell>Betrag</TableCell>
                <TableCell>Realized</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.transactions.slice(0, 20).map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.timestamp).toLocaleString("de-DE")}</TableCell>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell>{tx.symbol}</TableCell>
                  <TableCell>{tx.quantity}</TableCell>
                  <TableCell>{formatCurrency(tx.price)}</TableCell>
                  <TableCell>{formatCurrency(tx.total)}</TableCell>
                  <TableCell>
                    {tx.type === "SELL" ? formatCurrency(tx.realizedProfit || 0) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {state.transactions.length === 0 && (
            <Typography sx={{ mt: 2 }} color="text.secondary">
              Noch keine Trades vorhanden.
            </Typography>
          )}
      </Paper>
    </Box>
  );
}
