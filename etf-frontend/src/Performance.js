import { useEffect, useState } from "react";
import { Alert, Box, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { calculateMetrics, fetchLivePrices, fetchPortfolioBenchmarkSettings, formatCurrency, formatPercent, tradeTypeLabel } from "./simulatorStorage";
import { PortfolioAPI } from "./portfolioAPI";
import { formatDateTime, useI18n } from "./i18n";

function calculateBenchmarkReturnPct(annualRatePct, holdingDays) {
  const normalizedAnnualRatePct = Number(annualRatePct);
  const normalizedHoldingDays = Math.max(0, Math.floor(Number(holdingDays) || 0));

  if (!Number.isFinite(normalizedAnnualRatePct) || normalizedAnnualRatePct < 0) {
    return null;
  }

  const dailyRate = (normalizedAnnualRatePct / 100) / 365;
  return (Math.pow(1 + dailyRate, normalizedHoldingDays) - 1) * 100;
}

export default function Performance() {
  const { t } = useI18n();
  const [state, setState] = useState(null);
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [benchmarkAnnualRatePct, setBenchmarkAnnualRatePct] = useState(3);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const [portfolioState, benchmarkSettings] = await Promise.all([
          PortfolioAPI.load(),
          fetchPortfolioBenchmarkSettings()
        ]);
        setState(portfolioState);
        setBenchmarkAnnualRatePct(Number(benchmarkSettings?.annualRatePct || 3));

        const symbols = Object.keys(portfolioState?.holdings || {});
        const quoteData = await fetchLivePrices(false, symbols);
        if (quoteData) {
          setQuotes(quoteData);
        }
      } catch (loadError) {
        setError(loadError?.message || t("performance.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>{t("performance.loading")}</Typography>
      </Paper>
    );
  }

  if (!state) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error || t("performance.loadFailed")}</Alert>
      </Paper>
    );
  }

  const priceMap = quotes
    ? Object.fromEntries(
        Object.entries(quotes)
          .filter(([, quote]) => Number(quote?.price) > 0)
          .map(([symbol, quote]) => [symbol, quote.price])
      )
    : null;

  const metrics = calculateMetrics(state, priceMap);
  const benchmarkReturnPct = calculateBenchmarkReturnPct(benchmarkAnnualRatePct, metrics.returns.daysActive);
  const outperformancePct = metrics.returns.totalReturnPct == null || benchmarkReturnPct == null
    ? null
    : metrics.returns.totalReturnPct - benchmarkReturnPct;
  const hasCashDeficit = Number(metrics.cash || 0) < 0;
  const cashDeficitAmount = hasCashDeficit ? Math.abs(Number(metrics.cash || 0)) : 0;
  const cashCardTitle = hasCashDeficit ? t("performance.deficit") : t("performance.cash");
  const cashCardValue = hasCashDeficit ? cashDeficitAmount : metrics.cash;
  const metricCards = [
    {
      title: t("performance.realized"),
      value: formatCurrency(metrics.realizedPnl),
      color: metrics.realizedPnl >= 0 ? "success.main" : "error.main",
      tooltip: t("performance.realizedHint")
    },
    {
      title: t("performance.unrealized"),
      value: formatCurrency(metrics.unrealizedPnl),
      color: metrics.unrealizedPnl >= 0 ? "success.main" : "error.main",
      tooltip: t("performance.unrealizedHint")
    },
    {
      title: t("performance.totalPnl"),
      value: formatCurrency(metrics.totalPnl),
      color: metrics.totalPnl >= 0 ? "success.main" : "error.main",
      tooltip: t("performance.totalPnlHint")
    },
    {
      title: t("performance.performance"),
      value: formatPercent(outperformancePct),
      color: outperformancePct >= 0 ? "success.main" : "error.main",
      tooltip: t("performance.performanceHint")
    },
    {
      title: t("performance.returnTitle"),
      value: formatPercent(metrics.returns.totalReturnPct),
      color: metrics.returns.totalReturnPct >= 0 ? "success.main" : "error.main",
      tooltip: t("performance.returnHint")
    },
    {
      title: t("performance.xirr"),
      value: formatPercent(metrics.returns.moneyWeightedReturnPct),
      color: metrics.returns.moneyWeightedReturnPct >= 0 ? "success.main" : "error.main",
      tooltip: t("performance.xirrHint")
    },
    {
      title: t("performance.fees"),
      value: formatCurrency(metrics.totalFees),
      color: metrics.totalFees > 0 ? "error.main" : "text.primary",
      tooltip: t("performance.feesHint")
    },
    {
      title: cashCardTitle,
      value: formatCurrency(cashCardValue),
      color: hasCashDeficit ? "error.main" : "success.main",
      tooltip: hasCashDeficit ? t("performance.cashHintYes") : t("performance.cashHintNo")
    },
    {
      title: t("performance.runtime"),
      value: Number.isFinite(metrics.returns.daysActive)
        ? t("performance.runtimeDays", { days: Math.max(1, Math.round(metrics.returns.daysActive)) })
        : t("common.dash"),
      color: "text.primary",
      tooltip: t("performance.runtimeHint")
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
            {t("performance.lastTrades")}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("performance.time")}</TableCell>
                <TableCell>{t("performance.type")}</TableCell>
                <TableCell>{t("performance.symbol")}</TableCell>
                <TableCell>{t("performance.quantity")}</TableCell>
                <TableCell>{t("performance.price")}</TableCell>
                <TableCell>{t("performance.amount")}</TableCell>
                <TableCell>{t("performance.fee")}</TableCell>
                <TableCell>{t("performance.realizedCol")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.transactions.slice(0, 20).map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatDateTime(tx.timestamp)}</TableCell>
                  <TableCell>{tradeTypeLabel(tx.type)}</TableCell>
                  <TableCell>{tx.type === "DEPOT_FEE" ? t("common.dash") : tx.symbol}</TableCell>
                  <TableCell>{tx.type === "DEPOT_FEE" ? t("common.dash") : tx.quantity}</TableCell>
                  <TableCell>{tx.type === "DEPOT_FEE" ? t("common.dash") : formatCurrency(tx.price)}</TableCell>
                  <TableCell>{formatCurrency(tx.total)}</TableCell>
                  <TableCell sx={{ color: tx.fee ? "error.main" : "text.secondary" }}>
                    {tx.fee ? formatCurrency(tx.fee) : t("common.dash")}
                  </TableCell>
                  <TableCell>
                    {tx.type === "SELL" ? formatCurrency(tx.realizedProfit || 0) : t("common.dash")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {state.transactions.length === 0 && (
            <Typography sx={{ mt: 2 }} color="text.secondary">
              {t("performance.empty")}
            </Typography>
          )}
      </Paper>
    </Box>
  );
}
