import { useEffect, useState } from "react";
import { Alert, Box, Grid, Paper, Tooltip, Typography } from "@mui/material";
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
        const quoteData = await fetchLivePrices(true, symbols);
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
    : "Noch keine Positionen";
  let latestTradeLabel = "Noch keiner";
  if (latestTrade) {
    latestTradeLabel = latestTrade.type === "DEPOT_FEE" ? "Depotgebuehr" : latestTrade.symbol;
  }
  const latestTradeDetail = latestTrade
    ? `${latestTrade.type} | ${formatDateTime(latestTrade.timestamp)}`
    : "Keine Transaktionen vorhanden";

  function formatDateTime(value) {
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
  }

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
      title: "Gesamtwert",
      value: formatCurrency(metrics.totalValue),
      detail: hasCashDeficit
        ? `Cash-Unterdeckung: ${formatCurrency(metrics.cash)}`
        : `Cash: ${formatCurrency(metrics.cash)}`,
      tooltip: "Der Gesamtwert ist die Summe aus aktuellem Cash-Bestand und dem aktuellen Marktwert aller gehaltenen ETF-Positionen. Er zeigt also den kompletten Depotstand zum jetzigen Zeitpunkt.",
      to: "/portfolio"
    },
    {
      title: "Gesamt-Performance",
      value: formatCurrency(metrics.totalPnl),
      detail: `${formatPercent(metrics.returns.totalReturnPct)} seit Start`,
      tooltip: "Die Gesamt-Performance zeigt den gesamten Gewinn oder Verlust in Euro seit Start. Sie setzt sich aus realisierten Ergebnissen aus Verkaeufen und unrealisierter Wertveraenderung der aktuell gehaltenen Positionen zusammen.",
      color: metrics.totalPnl >= 0 ? "success.main" : "error.main",
      to: "/performance"
    },
    {
      title: "Rendite p.a.",
      value: formatPercent(metrics.returns.annualizedReturnPct),
      detail: "Annualisierte Rendite",
      tooltip: "Die Rendite p.a. rechnet die bisherige Gesamtentwicklung auf ein Jahr um. So lassen sich Zeitraeume unterschiedlicher Laenge besser vergleichen als mit der reinen Gesamtrendite.",
      color: metrics.returns.annualizedReturnPct >= 0 ? "success.main" : "error.main",
      to: "/performance"
    },
    {
      title: "Gebuehren gesamt",
      value: formatCurrency(metrics.totalFees),
      detail: "Bisher angefallene Gebuehren",
      tooltip: "Hier werden alle bisher angefallenen Transaktions- und Depotgebuehren aufsummiert. Diese Kosten sind bereits in Cash und Gesamtwert eingerechnet und werden nicht noch einmal separat abgezogen.",
      color: metrics.totalFees > 0 ? "error.main" : "text.primary",
      to: "/performance"
    },
    {
      title: "Unterdeckung",
      value: hasCashDeficit ? formatCurrency(cashDeficitAmount) : formatCurrency(0),
      detail: hasCashDeficit ? "Ausgleich des Cash-Kontos erforderlich" : "Keine Unterdeckung vorhanden",
      tooltip: hasCashDeficit
        ? "Eine Unterdeckung liegt vor, wenn das Cash-Konto (Verrechnungskonto) unter null gefallen ist. Der hier angezeigte Betrag entspricht genau dem Fehlbetrag, der rechnerisch ausgeglichen werden muesste."
        : "Solange keine Unterdeckung vorliegt, ist das Cash-Konto nicht im Minus. Dann besteht kein Ausgleichsbedarf.",
      color: hasCashDeficit ? "error.main" : "success.main",
      detailColor: hasCashDeficit ? "error.main" : "text.secondary",
      to: "/portfolio"
    },
    {
      title: "Cash",
      value: formatCurrency(hasCashDeficit ? 0 : metrics.cash),
      detail: hasCashDeficit ? "Kein frei verfuegbarer Cash-Bestand" : "Verfuegbar fuer ETF-Kaeufe",
      tooltip: hasCashDeficit
        ? "Bei einer Unterdeckung steht aktuell kein frei verfuegbarer Cash-Bestand fuer neue Kaeufe bereit. Zuerst muesste das Cash-Konto (Verrechnungskonto) wieder mindestens auf null gebracht werden."
        : "Cash ist der aktuell freie Restbetrag auf dem Cash-Konto (Verrechnungskonto). Rechnerisch ergibt er sich aus Startkapital minus Kaeufe minus Kaufgebuehren plus Verkaeufe minus Verkaufsgebuehren minus Depotgebuehren.",
      color: hasCashDeficit ? "error.main" : "success.main",
      to: "/performance"
    },
    {
      title: "Cash-Quote",
      value: formatPercent(cashQuote),
      detail: hasCashDeficit ? "Unterdeckung im Cash-Konto" : "Nicht investierter Anteil",
      tooltip: "Die Cash-Quote zeigt, wie gross der Anteil des nicht investierten Kapitals am aktuellen Gesamtwert ist. Bei einer Unterdeckung wird statt freiem Cash rechnerisch ein negativer Kontostand des Cash-Kontos sichtbar.",
      color: hasCashDeficit ? "error.main" : "text.primary"
    },
    {
      title: "Investitionsquote",
      value: formatPercent(investedQuote),
      detail: "Im Markt investierter Anteil",
      tooltip: "Die Investitionsquote zeigt, welcher Anteil deines aktuellen Gesamtwerts bereits in ETF-Positionen investiert ist und damit Marktschwankungen direkt ausgesetzt ist."
    },
    {
      title: "Groesste Position",
      value: largestPosition ? largestPosition.symbol : "Keine",
      detail: largestPositionDetail,
      tooltip: "Hier siehst du die aktuell groesste Position im Depot, gemessen am momentanen Marktwert. Die Detailzeile zeigt Anteil am Gesamtwert und absoluten Positionswert.",
      to: "/portfolio"
    },
    {
      title: "Bester ETF",
      value: bestPosition ? bestPosition.symbol : "Keine",
      detail: bestPosition
        ? `${formatPercent(bestPosition.pnlPct)} | ${formatCurrency(bestPosition.pnlAbs || 0)}`
        : "Noch keine Positionen",
      tooltip: "Zeigt die Position mit der aktuell besten Wertentwicklung im Depot. Angezeigt werden prozentuale Entwicklung und absoluter Gewinn oder Verlust in Euro.",
      color: bestPosition && bestPosition.pnlPct >= 0 ? "success.main" : "text.primary",
      to: "/portfolio"
    },
    {
      title: "Schwaechster ETF",
      value: worstPosition ? worstPosition.symbol : "Keine",
      detail: worstPosition
        ? `${formatPercent(worstPosition.pnlPct)} | ${formatCurrency(worstPosition.pnlAbs || 0)}`
        : "Noch keine Positionen",
      tooltip: "Zeigt die Position mit der aktuell schwaechsten Wertentwicklung im Depot. Angezeigt werden prozentuale Entwicklung und absoluter Gewinn oder Verlust in Euro.",
      color: worstPosition ? "error.main" : "text.primary",
      to: "/portfolio"
    },
    {
      title: "Letzter Trade",
      value: latestTradeLabel,
      detail: latestTradeDetail,
      tooltip: "Zeigt den letzten echten Kauf- oder Verkaufsvorgang im Depot. So erkennst du schnell, welche Position zuletzt aktiv gehandelt wurde und wann das passiert ist.",
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
          Negativer Cash-Saldo: Das Verrechnungskonto ist in Unterdeckung und sollte ausgeglichen werden.
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
