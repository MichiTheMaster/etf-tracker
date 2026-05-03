import { useEffect, useState } from "react";
import { Alert, Box, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { calculateMetrics, fetchLivePrices, formatCurrency, formatPercent } from "./simulatorStorage";
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
        const quoteData = await fetchLivePrices(true, symbols);
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
  const hasCashDeficit = Number(metrics.cash || 0) < 0;
  const cashDeficitAmount = hasCashDeficit ? Math.abs(Number(metrics.cash || 0)) : 0;
  const cashCardTitle = hasCashDeficit ? "Unterdeckung" : "Cash";
  const cashCardValue = hasCashDeficit ? cashDeficitAmount : metrics.cash;
  const metricCards = [
    {
      title: "Realized P/L",
      value: formatCurrency(metrics.realizedPnl),
      color: metrics.realizedPnl >= 0 ? "success.main" : "error.main",
      tooltip: "Zeigt den bereits realisierten Gewinn oder Verlust aus abgeschlossenen Verkaeufen. Dieser Wert entsteht erst dann, wenn eine Position ganz oder teilweise verkauft wurde."
    },
    {
      title: "Unrealized P/L",
      value: formatCurrency(metrics.unrealizedPnl),
      color: metrics.unrealizedPnl >= 0 ? "success.main" : "error.main",
      tooltip: "Zeigt den aktuellen Buchgewinn oder Buchverlust deiner noch gehaltenen Positionen. Grundlage ist der Vergleich zwischen aktuellem Marktwert und historischem Einstandswert."
    },
    {
      title: "Gesamt P/L",
      value: formatCurrency(metrics.totalPnl),
      color: metrics.totalPnl >= 0 ? "success.main" : "error.main",
      tooltip: "Addiert realisierte und unrealisierte Ergebnisse. Damit siehst du den gesamten bisherigen Erfolg oder Misserfolg des Portfolios ohne getrennte Betrachtung einzelner Positionen."
    },
    {
      title: "Rendite gesamt",
      value: formatPercent(metrics.returns.totalReturnPct),
      color: metrics.returns.totalReturnPct >= 0 ? "success.main" : "error.main",
      tooltip: "Die Gesamtrendite vergleicht den aktuellen Gesamtwert des Portfolios mit dem rechnerischen Startkapital. Sie zeigt die Entwicklung seit Beginn in Prozent, aber nicht pro Jahr normiert."
    },
    {
      title: "Rendite p.a.",
      value: formatPercent(metrics.returns.annualizedReturnPct),
      color: metrics.returns.annualizedReturnPct >= 0 ? "success.main" : "error.main",
      tooltip: "Die annualisierte Rendite rechnet die bisherige Entwicklung auf eine Jahresbasis um. Damit lassen sich Zeitraeume unterschiedlicher Laenge besser vergleichen."
    },
    {
      title: "Money Weighted (XIRR)",
      value: formatPercent(metrics.returns.moneyWeightedReturnPct),
      color: metrics.returns.moneyWeightedReturnPct >= 0 ? "success.main" : "error.main",
      tooltip: "Die geldgewichtete Rendite beruecksichtigt den Zeitpunkt deiner Ein- und Auszahlungen. Sie ist besonders hilfreich, wenn du ueber die Zeit mehrfach nachgekauft oder verkauft hast."
    },
    {
      title: "Gesamtgebuehren",
      value: formatCurrency(metrics.totalFees),
      color: metrics.totalFees > 0 ? "error.main" : "text.primary",
      tooltip: "Hier werden alle bisher angefallenen Transaktions- und Depotgebuehren aufsummiert. Der Wert ist eine kumulierte Kostenkennzahl und bereits indirekt im aktuellen Cash und Gesamtwert enthalten."
    },
    {
      title: cashCardTitle,
      value: formatCurrency(cashCardValue),
      color: hasCashDeficit ? "error.main" : "success.main",
      tooltip: hasCashDeficit
        ? "Zeigt die aktuelle Unterdeckung des Cash-Kontos (Verrechnungskontos). Rechnerisch ergibt sie sich aus dem laufenden Kontostand nach allen Buchungen: Startkapital minus Kaeufe minus Kaufgebuehren plus Verkaeufe minus Verkaufsgebuehren minus Depotgebuehren. Liegt dieses Ergebnis unter null, wird der Fehlbetrag hier als Unterdeckung angezeigt."
        : "Zeigt den aktuell verfuegbaren Restbetrag auf dem Cash-Konto (Verrechnungskonto). Rechnerisch gilt: Cash = Startkapital minus Kaeufe minus Kaufgebuehren plus Verkaeufe minus Verkaufsgebuehren minus Depotgebuehren. Dieser Betrag kann fuer neue ETF-Kaeufe verwendet werden, sofern Kaufpreis plus Transaktionsgebuehr den Cash-Bestand nicht uebersteigen."
    },
    {
      title: "Laufzeit",
      value: Number.isFinite(metrics.returns.daysActive) ? `${Math.max(1, Math.round(metrics.returns.daysActive))} Tage` : "-",
      color: "text.primary",
      tooltip: "Zeigt, wie lange das Portfolio bereits aktiv ist. Die Laufzeit dient als Grundlage fuer annualisierte Kennzahlen wie die Rendite p.a. oder die XIRR-Betrachtung."
    }
  ];

  const renderMetricCard = ({ title, value, color, tooltip }) => (
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
        </Paper>
      </Tooltip>
    </Grid>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Grid container spacing={3}>
        {metricCards.map(renderMetricCard)}
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
                <TableCell>Gebühr</TableCell>
                <TableCell>Realized</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.transactions.slice(0, 20).map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.timestamp).toLocaleString("de-DE")}</TableCell>
                  <TableCell>{tx.type === "DEPOT_FEE" ? "Depotgebühr" : tx.type}</TableCell>
                  <TableCell>{tx.type === "DEPOT_FEE" ? "-" : tx.symbol}</TableCell>
                  <TableCell>{tx.type === "DEPOT_FEE" ? "-" : tx.quantity}</TableCell>
                  <TableCell>{tx.type === "DEPOT_FEE" ? "-" : formatCurrency(tx.price)}</TableCell>
                  <TableCell>{formatCurrency(tx.total)}</TableCell>
                  <TableCell sx={{ color: tx.fee ? "error.main" : "text.secondary" }}>
                    {tx.fee ? formatCurrency(tx.fee) : "-"}
                  </TableCell>
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
