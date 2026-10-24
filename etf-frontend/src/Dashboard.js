import { useEffect, useState } from "react";
import { Alert, Box, Paper, Tooltip, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { calculateMetrics, fetchLivePrices, formatCurrency, formatPercent, tradeTypeLabel } from "./simulatorStorage";
import { PortfolioAPI } from "./portfolioAPI";
import { formatDateTime, useI18n } from "./i18n";

export default function Dashboard() {
  const { t } = useI18n();
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
        setError(loadError?.message || t("dashboard.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>{t("dashboard.loading")}</Typography>
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
          {error || t("dashboard.loadFailed")}
        </Alert>
      </Paper>
    );
  }

  const priceMap = quotes
    ? Object.fromEntries(
        Object.entries(quotes)
          .filter(([, quote]) => Number(quote?.price) > 0)
          .map(([s, q]) => [s, q.price])
      )
    : null;

  const metrics = calculateMetrics(state, priceMap);
  const hasCashDeficit = Number(metrics.cash || 0) < 0;
  const cashDeficitAmount = hasCashDeficit ? Math.abs(Number(metrics.cash || 0)) : 0;
  const totalValue = Number(metrics.totalValue || 0);
  const cashQuote = totalValue > 0 ? (Number(metrics.cash || 0) / totalValue) * 100 : 0;
  const investedQuote = totalValue > 0 ? (Number(metrics.investedValue || 0) / totalValue) * 100 : 0;
  const positions = Array.isArray(metrics.positions) ? metrics.positions : [];
  const largestPosition = positions.reduce((largest, position) => {
    if (!largest || Number(position.currentValue || 0) > Number(largest.currentValue || 0)) {
      return position;
    }
    return largest;
  }, null);
  const bestPosition = positions.reduce((best, position) => {
    if (position.pnlPct == null) {
      return best;
    }
    if (!best || Number(position.pnlPct) > Number(best.pnlPct)) {
      return position;
    }
    return best;
  }, null);
  const worstPosition = positions.reduce((worst, position) => {
    if (position.pnlPct == null) {
      return worst;
    }
    if (!worst || Number(position.pnlPct) < Number(worst.pnlPct)) {
      return position;
    }
    return worst;
  }, null);
  const latestTrade = Array.isArray(state.transactions)
    ? state.transactions.find((transaction) => transaction.type === "BUY" || transaction.type === "SELL") || null
    : null;
  const largestPositionShare = largestPosition && totalValue > 0
    ? (Number(largestPosition.currentValue || 0) / totalValue) * 100
    : 0;
  const largestPositionDetail = largestPosition
    ? `${formatPercent(largestPositionShare)} | ${formatCurrency(largestPosition.currentValue || 0)}`
    : t("dashboard.bestNone");
  let latestTradeLabel = t("dashboard.lastTradeNone");
  if (latestTrade) {
    latestTradeLabel = latestTrade.type === "DEPOT_FEE" ? t("trade.depotFee") : latestTrade.symbol;
  }
  const latestTradeDetail = latestTrade
    ? `${tradeTypeLabel(latestTrade.type)} | ${formatDateTime(latestTrade.timestamp)}`
    : t("dashboard.lastTradeEmpty");

  const renderCard = ({ title, value, detail, color = "text.primary", detailColor = "text.secondary", tooltip, to }) => (
    <Tooltip
      key={title}
      title={<Typography variant="body2">{tooltip || detail}</Typography>}
      arrow
      placement="top"
    >
      <Paper component={to ? Link : "div"} to={to} sx={{ ...cardSx, cursor: to ? "pointer" : "help" }}>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" color={color}>
          {value}
        </Typography>
        <Typography variant="body2" color={detailColor}>
          {detail}
        </Typography>
      </Paper>
    </Tooltip>
  );

  const cards = [
    {
      title: t("dashboard.totalValue"),
      value: formatCurrency(metrics.totalValue),
      detail: hasCashDeficit
        ? t("dashboard.totalValueDeficit", { value: formatCurrency(metrics.cash) })
        : t("dashboard.totalValueCash", { value: formatCurrency(metrics.cash) }),
      tooltip: t("dashboard.totalValueHint"),
      to: "/portfolio"
    },
    {
      title: t("dashboard.totalPnl"),
      value: formatCurrency(metrics.totalPnl),
      detail: t("dashboard.totalPnlSince", { value: formatPercent(metrics.returns.totalReturnPct) }),
      tooltip: t("dashboard.totalPnlHint"),
      color: metrics.totalPnl >= 0 ? "success.main" : "error.main",
      to: "/performance"
    },
    {
      title: t("dashboard.returnTitle"),
      value: formatPercent(metrics.returns.totalReturnPct),
      detail: t("dashboard.returnDetail"),
      tooltip: t("dashboard.returnHint"),
      color: metrics.returns.totalReturnPct >= 0 ? "success.main" : "error.main",
      to: "/performance"
    },
    {
      title: t("dashboard.feesTitle"),
      value: formatCurrency(metrics.totalFees),
      detail: t("dashboard.feesDetail"),
      tooltip: t("dashboard.feesHint"),
      color: metrics.totalFees > 0 ? "error.main" : "text.primary",
      to: "/performance"
    },
    {
      title: t("dashboard.deficit"),
      value: hasCashDeficit ? formatCurrency(cashDeficitAmount) : formatCurrency(0),
      detail: hasCashDeficit ? t("dashboard.deficitNeeded") : t("dashboard.deficitNone"),
      tooltip: hasCashDeficit ? t("dashboard.deficitHintYes") : t("dashboard.deficitHintNo"),
      color: hasCashDeficit ? "error.main" : "success.main",
      detailColor: hasCashDeficit ? "error.main" : "text.secondary",
      to: "/portfolio"
    },
    {
      title: t("dashboard.cash"),
      value: formatCurrency(hasCashDeficit ? 0 : metrics.cash),
      detail: hasCashDeficit ? t("dashboard.cashNone") : t("dashboard.cashAvailable"),
      tooltip: hasCashDeficit ? t("dashboard.cashHintYes") : t("dashboard.cashHintNo"),
      color: hasCashDeficit ? "error.main" : "success.main",
      to: "/performance"
    },
    {
      title: t("dashboard.cashQuote"),
      value: formatPercent(cashQuote),
      detail: hasCashDeficit ? t("dashboard.cashQuoteDeficit") : t("dashboard.cashQuoteInvested"),
      tooltip: t("dashboard.cashQuoteHint"),
      color: hasCashDeficit ? "error.main" : "text.primary"
    },
    {
      title: t("dashboard.investQuote"),
      value: formatPercent(investedQuote),
      detail: t("dashboard.investQuoteDetail"),
      tooltip: t("dashboard.investQuoteHint")
    },
    {
      title: t("dashboard.largest"),
      value: largestPosition ? largestPosition.symbol : t("common.none"),
      detail: largestPositionDetail,
      tooltip: t("dashboard.largestHint"),
      to: "/portfolio"
    },
    {
      title: t("dashboard.best"),
      value: bestPosition ? bestPosition.symbol : t("common.none"),
      detail: bestPosition
        ? `${formatPercent(bestPosition.pnlPct)} | ${formatCurrency(bestPosition.pnlAbs || 0)}`
        : t("dashboard.bestNone"),
      tooltip: t("dashboard.bestHint"),
      color: bestPosition && bestPosition.pnlPct >= 0 ? "success.main" : "text.primary",
      to: "/portfolio"
    },
    {
      title: t("dashboard.worst"),
      value: worstPosition ? worstPosition.symbol : t("common.none"),
      detail: worstPosition
        ? `${formatPercent(worstPosition.pnlPct)} | ${formatCurrency(worstPosition.pnlAbs || 0)}`
        : t("dashboard.bestNone"),
      tooltip: t("dashboard.worstHint"),
      color: worstPosition ? "error.main" : "text.primary",
      to: "/portfolio"
    },
    {
      title: t("dashboard.lastTrade"),
      value: latestTradeLabel,
      detail: latestTradeDetail,
      tooltip: t("dashboard.lastTradeHint"),
      to: "/performance"
    }
  ];
  const cardSx = {
    p: 2,
    display: "block",
    minWidth: 0,
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {hasCashDeficit && (
        <Alert severity="warning" variant="filled">
          {t("dashboard.cashAlert")}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
            xl: "repeat(6, minmax(0, 1fr))"
          },
          alignItems: "stretch"
        }}
      >
        {cards.map(renderCard)}
      </Box>
    </Box>
  );
}
