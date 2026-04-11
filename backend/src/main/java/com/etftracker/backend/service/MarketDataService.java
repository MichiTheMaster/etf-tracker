package com.etftracker.backend.service;

import com.etftracker.backend.dto.EtfPoolItemResponse;
import com.etftracker.backend.dto.QuoteResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    private final RestTemplate restTemplate = new RestTemplate();

    private record CacheEntry(double price, long timestamp, Double ter, String provider, String providerSymbol,
            String terSource) {
    }

    private record YahooResult(double price, Double ter, String providerSymbol, String terSource) {
    }

    private record TerLookup(Double ter, String source) {
    }

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final Set<String> missingTerSymbols = ConcurrentHashMap.newKeySet();

    private static final long CACHE_TTL_MS = 60_000L;
    private static final Pattern STOOQ_SYMBOL_PATTERN = Pattern.compile("\"symbol\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern STOOQ_CLOSE_PATTERN = Pattern.compile("\"close\"\\s*:\\s*\"([^\"]+)\"");

    private static final Map<String, String> STOOQ_SYMBOLS = Map.of(
            "VWCE", "vwce.de",
            "EUNL", "eunl.de",
            "EMIM", "eimi.uk",
            "SXR8", "sxr8.de",
            "EXSA", "exsa.de",
            "SPYD", "spyd.us");

    private static final Map<String, String> YAHOO_SYMBOLS = Map.ofEntries(
            Map.entry("VWCE", "VWCE.DE"),
            Map.entry("EUNL", "EUNL.DE"),
            Map.entry("SXR8", "SXR8.DE"),
            Map.entry("EXSA", "EXSA.DE"),
            Map.entry("VUSA", "VUSA.DE"),
            Map.entry("CSPX", "CSPX.L"),
            Map.entry("IUSN", "IUSN.DE"),
            Map.entry("EIMI", "EIMI.L"),
            Map.entry("EMIM", "EIMI.L"));

    private static final Map<String, String> REVERSE_SYMBOLS;

    static {
        Map<String, String> rev = new HashMap<>();
        STOOQ_SYMBOLS.forEach((k, v) -> rev.put(v.toUpperCase(Locale.ROOT), k));
        REVERSE_SYMBOLS = Collections.unmodifiableMap(rev);
    }

    private static final Map<String, Double> FALLBACK = Map.of(
            "VWCE", 116.2,
            "EUNL", 89.45,
            "EMIM", 33.8,
            "SXR8", 520.9,
            "EXSA", 50.4,
            "SPYD", 62.7);

    private static final Map<String, Double> TER_FALLBACK_DEFAULTS = Map.ofEntries(
            Map.entry("VWCE", 0.22),
            Map.entry("EUNL", 0.20),
            Map.entry("EMIM", 0.18),
            Map.entry("SXR8", 0.07),
            Map.entry("EXSA", 0.20),
            Map.entry("SPYD", 0.35),
            Map.entry("IUSN", 0.35),
            Map.entry("CSPX", 0.07),
            Map.entry("VUSA", 0.07),
            Map.entry("XDAX", 0.09),
            Map.entry("IMEU", 0.12),
            Map.entry("EIMI", 0.18),
            Map.entry("JAAA", 0.20),
            Map.entry("BCUS", 0.70));

    private final Map<String, Double> terFallbacks;
    private final Path terFallbackFilePath;

    private static final List<EtfPoolItemResponse> ETF_POOL_FALLBACK = List.of(
            new EtfPoolItemResponse("VWCE", "Vanguard FTSE All-World UCITS ETF", "XETRA", "EUR", 116.2),
            new EtfPoolItemResponse("EUNL", "iShares Core MSCI World UCITS ETF", "XETRA", "EUR", 89.45),
            new EtfPoolItemResponse("EMIM", "iShares Core MSCI EM IMI UCITS ETF", "XETRA", "EUR", 33.8),
            new EtfPoolItemResponse("SXR8", "iShares Core S&P 500 UCITS ETF", "XETRA", "EUR", 520.9),
            new EtfPoolItemResponse("EXSA", "iShares STOXX Europe 600 UCITS ETF", "XETRA", "EUR", 50.4),
            new EtfPoolItemResponse("SPYD", "SPDR S&P U.S. Dividend Aristocrats ETF", "NYSE", "USD", 62.7),
            new EtfPoolItemResponse("VUSA", "Vanguard S&P 500 UCITS ETF", "XETRA", "EUR", 95.8),
            new EtfPoolItemResponse("CSPX", "iShares Core S&P 500 UCITS ETF", "LSE", "USD", 560.1),
            new EtfPoolItemResponse("IUSN", "iShares MSCI World Small Cap UCITS ETF", "XETRA", "EUR", 54.2),
            new EtfPoolItemResponse("EIMI", "iShares Core MSCI Emerging Markets IMI ETF", "LSE", "USD", 35.7));

    public MarketDataService(
            @Value("classpath:ter-fallbacks.properties") Resource terFallbackResource,
            @Value("${ter.fallback.file:./ter-fallbacks.properties}") String terFallbackFile) {
        this.terFallbacks = new ConcurrentHashMap<>();
        this.terFallbackFilePath = Paths.get(terFallbackFile).toAbsolutePath().normalize();
        loadTerFallbacks(terFallbackResource, this.terFallbackFilePath);
    }

    public Map<String, QuoteResponse> getQuotes(List<String> symbols, boolean forceRefresh) {
        return getQuotes(symbols, forceRefresh, false);
    }

    public Map<String, QuoteResponse> getQuotes(List<String> symbols, boolean forceRefresh, boolean debugEnabled) {
        Map<String, QuoteResponse> result = new LinkedHashMap<>();
        List<String> toFetch = new ArrayList<>();
        long now = System.currentTimeMillis();

        for (String sym : symbols) {
            if (forceRefresh) {
                toFetch.add(sym);
                continue;
            }
            CacheEntry entry = cache.get(sym);
            if (entry != null && (now - entry.timestamp()) < CACHE_TTL_MS) {
                result.put(sym, createQuote(sym, entry.price(), "cached", resolveTer(sym, entry.ter()), debugEnabled,
                        entry.provider(), entry.providerSymbol(), entry.terSource()));
            } else {
                toFetch.add(sym);
            }
        }

        if (!toFetch.isEmpty()) {
            fetchFromStooq(toFetch, result, debugEnabled);
        }

        return result;
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    public List<EtfPoolItemResponse> searchEtfs(String query, int limit) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        String encoded = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
        String url = "https://query1.finance.yahoo.com/v1/finance/search?q=" + encoded + "&quotesCount=30&newsCount=0";

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (compatible; ETFTracker/1.0)");
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null || !(body.get("quotes") instanceof List<?> quotes)) {
                return List.of();
            }

            List<EtfPoolItemResponse> result = new ArrayList<>();
            Set<String> seenSymbols = new HashSet<>();
            for (Object item : quotes) {
                if (!(item instanceof Map<?, ?> map)) {
                    continue;
                }

                String quoteType = Objects.toString(map.get("quoteType"), "").toUpperCase(Locale.ROOT);

                String symbol = Objects.toString(map.get("symbol"), "").trim();
                if (symbol.isEmpty()) {
                    continue;
                }

                Object shortNameObj = map.get("shortname");
                Object longNameObj = map.get("longname");
                Object exchangeObj = map.get("exchange");
                Object currencyObj = map.get("currency");

                String name = Objects.toString(shortNameObj != null ? shortNameObj : longNameObj, symbol);
                String exchange = Objects.toString(exchangeObj, "-");
                String currency = Objects.toString(currencyObj, "-");
                Double marketPrice = null;
                Object marketPriceObj = map.get("regularMarketPrice");
                if (marketPriceObj != null) {
                    try {
                        marketPrice = Double.parseDouble(marketPriceObj.toString());
                    } catch (NumberFormatException ignored) {
                        marketPrice = null;
                    }
                }

                String normalizedName = name.toUpperCase(Locale.ROOT);
                boolean looksLikeEtfByType = "ETF".equals(quoteType) || "MUTUALFUND".equals(quoteType);
                boolean looksLikeEtfByName = normalizedName.contains("ETF") || normalizedName.contains("UCITS")
                        || normalizedName.contains("INDEX");

                if (!looksLikeEtfByType && !looksLikeEtfByName) {
                    continue;
                }

                String normalizedSymbol = symbol.toUpperCase(Locale.ROOT);
                if (seenSymbols.contains(normalizedSymbol)) {
                    continue;
                }

                seenSymbols.add(normalizedSymbol);
                result.add(new EtfPoolItemResponse(normalizedSymbol, name, exchange, currency, marketPrice));
                if (result.size() >= limit) {
                    break;
                }
            }

            String q = query.trim().toUpperCase(Locale.ROOT);
            for (EtfPoolItemResponse fallback : ETF_POOL_FALLBACK) {
                if (result.size() >= limit) {
                    break;
                }

                String fallbackSymbol = fallback.getSymbol().toUpperCase(Locale.ROOT);
                String fallbackName = fallback.getName().toUpperCase(Locale.ROOT);
                if (seenSymbols.contains(fallbackSymbol)) {
                    continue;
                }
                if (!fallbackSymbol.contains(q) && !fallbackName.contains(q)) {
                    continue;
                }

                seenSymbols.add(fallbackSymbol);
                result.add(fallback);
            }

            return result.stream().limit(limit).toList();
        } catch (Exception e) {
            log.warn("ETF search failed: {}", e.getMessage());
            String q = query.trim().toUpperCase(Locale.ROOT);
            return ETF_POOL_FALLBACK.stream()
                    .filter(item -> item.getSymbol().toUpperCase(Locale.ROOT).contains(q)
                            || item.getName().toUpperCase(Locale.ROOT).contains(q))
                    .limit(limit)
                    .toList();
        }
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    private void fetchFromStooq(List<String> symbols, Map<String, QuoteResponse> result, boolean debugEnabled) {
        long now = System.currentTimeMillis();
        for (String symbol : symbols) {
            try {
                String stooqSymbol = STOOQ_SYMBOLS.getOrDefault(symbol, symbol.toLowerCase(Locale.ROOT));
                String url = "https://stooq.com/q/l/?s=" + stooqSymbol + "&f=sd2t2ohlcvn&e=json";

                HttpHeaders headers = new HttpHeaders();
                headers.set("User-Agent", "Mozilla/5.0 (compatible; ETFTracker/1.0)");
                headers.set("Accept", "application/json,text/plain,*/*");
                HttpEntity<String> entity = new HttpEntity<>(headers);

                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                String body = response.getBody();

                if (body == null || body.isBlank()) {
                    putYahooOrDemo(symbol, result, now, debugEnabled);
                    continue;
                }

                if (body.toLowerCase(Locale.ROOT).contains("exceeded the daily hits limit")) {
                    log.warn("Stooq daily limit reached. Falling back to Yahoo for {}", symbol);
                    putYahooOrDemo(symbol, result, now, debugEnabled);
                    continue;
                }

                Matcher symbolMatcher = STOOQ_SYMBOL_PATTERN.matcher(body);
                Matcher closeMatcher = STOOQ_CLOSE_PATTERN.matcher(body);
                if (!symbolMatcher.find() || !closeMatcher.find()) {
                    putYahooOrDemo(symbol, result, now, debugEnabled);
                    continue;
                }

                String rawResolvedSymbol = symbolMatcher.group(1);
                String resolvedSymbol = REVERSE_SYMBOLS.getOrDefault(
                        rawResolvedSymbol.toUpperCase(Locale.ROOT),
                        symbol);

                String closeValue = closeMatcher.group(1);
                if (!"N/D".equalsIgnoreCase(closeValue)) {
                    double price = Double.parseDouble(closeValue);
                    Double ter = resolveTer(resolvedSymbol, null);
                    String terSource = ter != null ? "fallback" : null;
                    if (ter == null) {
                        TerLookup fetchedTer = fetchTerFromYahoo(resolvedSymbol);
                        if (fetchedTer != null && fetchedTer.ter() != null) {
                            ter = fetchedTer.ter();
                            terSource = fetchedTer.source();
                            maybePersistTerFallback(resolvedSymbol, ter);
                        }
                    }

                    cache.put(resolvedSymbol,
                            new CacheEntry(price, now, ter, "stooq", stooqSymbol.toUpperCase(Locale.ROOT), terSource));
                    result.put(resolvedSymbol, createQuote(resolvedSymbol, price, "live", ter, debugEnabled,
                            "stooq", stooqSymbol.toUpperCase(Locale.ROOT), terSource));
                } else {
                    putYahooOrDemo(symbol, result, now, debugEnabled);
                }
            } catch (Exception e) {
                log.warn("Stooq request failed for {}: {}", symbol, e.getMessage());
                putYahooOrDemo(symbol, result, now, debugEnabled);
            }
        }

        for (String sym : symbols) {
            result.computeIfAbsent(sym,
                    s -> createQuote(s, FALLBACK.getOrDefault(s, 0.0), "demo", resolveTer(s, null), debugEnabled,
                            "fallback", "fallback-static", "fallback"));
        }
    }

    private void putYahooOrDemo(String symbol, Map<String, QuoteResponse> result, long now, boolean debugEnabled) {
        YahooResult yahooResult = fetchFromYahoo(symbol);
        if (yahooResult != null) {
            Double ter = resolveTer(symbol, yahooResult.ter());
            String terSource = yahooResult.ter() != null && yahooResult.ter() > 0
                    ? (yahooResult.terSource() != null ? yahooResult.terSource() : "provider")
                    : "fallback";

            if (yahooResult.ter() != null && yahooResult.ter() > 0) {
                maybePersistTerFallback(symbol, yahooResult.ter());
            }

            cache.put(symbol,
                    new CacheEntry(yahooResult.price(), now, ter, "yahoo", yahooResult.providerSymbol(), terSource));
            result.put(symbol, createQuote(symbol, yahooResult.price(), "live", ter, debugEnabled,
                    "yahoo", yahooResult.providerSymbol(), terSource));
            return;
        }

        result.put(symbol, createQuote(symbol, FALLBACK.getOrDefault(symbol, 0.0), "fallback",
                resolveTer(symbol, null), debugEnabled, "fallback", "fallback-static", "fallback"));
    }

    private YahooResult fetchFromYahoo(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return null;
        }

        for (String candidate : buildYahooCandidates(symbol)) {
            YahooResult hit = fetchFromYahooCandidate(candidate);
            if (hit != null) {
                return hit;
            }
        }

        return null;
    }

    private YahooResult fetchFromYahooCandidate(String symbol) {
        try {
            String encoded = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encoded + "?interval=1d&range=1d";

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36");
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null || !(body.get("chart") instanceof Map<?, ?> chart)) {
                return null;
            }

            Object resultObj = chart.get("result");
            if (!(resultObj instanceof List<?> results) || results.isEmpty()) {
                return null;
            }

            Object first = results.get(0);
            if (!(first instanceof Map<?, ?> resultMap)) {
                return null;
            }

            Object metaObj = resultMap.get("meta");
            if (!(metaObj instanceof Map<?, ?> meta)) {
                return null;
            }

            Object marketPrice = meta.get("regularMarketPrice");
            if (marketPrice == null) {
                return null;
            }
            double price = Double.parseDouble(marketPrice.toString());

            // Extract TER – Yahoo stores expense ratio as fraction (0.002 = 0.2%)
            Double ter = null;
            String terSource = null;
            Object expRatioObj = meta.get("annualReportExpenseRatio");
            if (expRatioObj == null) {
                expRatioObj = meta.get("expenseRatio");
            }
            ter = normalizeTer(expRatioObj);
            if (ter != null) {
                terSource = "yahoo-chart-meta";
            } else {
                TerLookup fallbackTer = fetchTerFromYahooSummary(symbol);
                if (fallbackTer != null) {
                    ter = fallbackTer.ter();
                    terSource = fallbackTer.source();
                }
            }

            return new YahooResult(price, ter, symbol, terSource);
        } catch (Exception e) {
            log.debug("Yahoo chart fallback failed for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    private TerLookup fetchTerFromYahoo(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return null;
        }

        for (String candidate : buildYahooCandidates(symbol)) {
            TerLookup hit = fetchTerFromYahooSummary(candidate);
            if (hit != null && hit.ter() != null) {
                return hit;
            }
        }

        return null;
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    private TerLookup fetchTerFromYahooSummary(String symbol) {
        try {
            String encoded = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/" + encoded
                    + "?modules=fundProfile,summaryDetail,defaultKeyStatistics";

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36");
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null || !(body.get("quoteSummary") instanceof Map<?, ?> quoteSummary)) {
                return null;
            }

            Object resultObj = quoteSummary.get("result");
            if (!(resultObj instanceof List<?> results) || results.isEmpty()) {
                return null;
            }

            Object first = results.get(0);
            if (!(first instanceof Map<?, ?> resultMap)) {
                return null;
            }

            Object summaryDetailObj = resultMap.get("summaryDetail");
            if (summaryDetailObj instanceof Map<?, ?> summaryDetail) {
                Double ter = extractTerFromMap(summaryDetail);
                if (ter != null) {
                    return new TerLookup(ter, "yahoo-summaryDetail");
                }
            }

            Object fundProfileObj = resultMap.get("fundProfile");
            if (fundProfileObj instanceof Map<?, ?> fundProfile) {
                Double ter = extractTerFromMap(fundProfile);
                if (ter != null) {
                    return new TerLookup(ter, "yahoo-fundProfile");
                }
            }

            Object statsObj = resultMap.get("defaultKeyStatistics");
            if (statsObj instanceof Map<?, ?> stats) {
                Double ter = extractTerFromMap(stats);
                if (ter != null) {
                    return new TerLookup(ter, "yahoo-defaultKeyStatistics");
                }
            }

            return null;
        } catch (Exception e) {
            log.debug("Yahoo TER summary lookup failed for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    private Set<String> buildYahooCandidates(String symbol) {
        String normalized = symbol.trim().toUpperCase(Locale.ROOT);
        LinkedHashSet<String> candidates = new LinkedHashSet<>();

        String preferred = YAHOO_SYMBOLS.get(normalized);
        if (preferred != null && !preferred.isBlank()) {
            candidates.add(preferred);
        }

        candidates.add(normalized);
        candidates.add(normalized + ".DE");
        candidates.add(normalized + ".F");
        candidates.add(normalized + ".L");

        return candidates;
    }

    private Double extractTerFromMap(Map<?, ?> map) {
        if (map == null || map.isEmpty()) {
            return null;
        }

        List<String> keys = List.of(
                "annualReportExpenseRatio",
                "expenseRatio",
                "netExpenseRatio",
                "managementExpenseRatio");

        for (String key : keys) {
            Object value = map.get(key);
            Double ter = normalizeTer(value);
            if (ter != null) {
                return ter;
            }

            if (value instanceof Map<?, ?> nested) {
                ter = normalizeTer(nested.get("raw"));
                if (ter != null) {
                    return ter;
                }
            }
        }

        return null;
    }

    private Double normalizeTer(Object value) {
        Double raw = extractDouble(value);
        if (raw == null || raw <= 0) {
            return null;
        }

        if (raw < 1) {
            return roundTwo(raw * 100);
        }

        if (raw <= 100) {
            return roundTwo(raw);
        }

        return null;
    }

    private Double extractDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        if (value instanceof Map<?, ?> nested) {
            Object raw = nested.get("raw");
            if (raw instanceof Number rn) {
                return rn.doubleValue();
            }
            if (raw != null) {
                try {
                    return Double.parseDouble(raw.toString());
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
            return null;
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private void maybePersistTerFallback(String symbol, Double providerTer) {
        if (symbol == null || symbol.isBlank() || providerTer == null || providerTer <= 0) {
            return;
        }

        String normalized = symbol.trim().toUpperCase(Locale.ROOT);
        Double existing = terFallbacks.get(normalized);
        if (existing != null && Math.abs(existing - providerTer) < 0.005) {
            return;
        }

        upsertTerFallback(normalized, providerTer);
    }

    private QuoteResponse createQuote(
            String symbol,
            double price,
            String source,
            Double ter,
            boolean debugEnabled,
            String provider,
            String providerSymbol,
            String terSource) {
        if (!debugEnabled) {
            return new QuoteResponse(symbol, price, source, ter);
        }

        Map<String, String> debug = new LinkedHashMap<>();
        debug.put("provider", provider == null ? "-" : provider);
        debug.put("providerSymbol", providerSymbol == null ? "-" : providerSymbol);
        debug.put("terSource", terSource == null ? "-" : terSource);

        return new QuoteResponse(symbol, price, source, ter, debug);
    }

    private void useFallback(List<String> symbols, Map<String, QuoteResponse> result) {
        for (String sym : symbols) {
            result.computeIfAbsent(sym,
                    s -> createQuote(s, FALLBACK.getOrDefault(s, 0.0), "fallback", resolveTer(s, null), false,
                            "fallback", "fallback-static", "fallback"));
        }
    }

    private Double resolveTer(String symbol, Double providerTer) {
        if (providerTer != null && providerTer > 0) {
            return providerTer;
        }
        if (symbol == null || symbol.isBlank()) {
            return null;
        }
        String normalized = symbol.toUpperCase(Locale.ROOT);
        Double fallbackTer = terFallbacks.get(normalized);
        if (fallbackTer == null) {
            missingTerSymbols.add(normalized);
        }
        return fallbackTer;
    }

    private void loadTerFallbacks(Resource classpathResource, Path externalFile) {
        terFallbacks.clear();
        terFallbacks.putAll(TER_FALLBACK_DEFAULTS);

        loadPropertiesIntoMap(classpathResource, "classpath ter-fallbacks.properties");

        if (Files.exists(externalFile)) {
            Properties externalProps = new Properties();
            try (InputStream in = Files.newInputStream(externalFile)) {
                externalProps.load(in);
                mergeProperties(externalProps, externalFile.toString());
            } catch (Exception e) {
                log.warn("Could not read TER fallback file '{}': {}", externalFile, e.getMessage());
            }
        } else {
            try {
                Path parent = externalFile.getParent();
                if (parent != null && !Files.exists(parent)) {
                    Files.createDirectories(parent);
                }
                Files.writeString(externalFile,
                        "# TER fallback values in percent (e.g. 0.22 = 0.22%)" + System.lineSeparator(),
                        StandardOpenOption.CREATE, StandardOpenOption.APPEND);
                log.info("Created TER fallback file at {}", externalFile);
            } catch (Exception e) {
                log.warn("Could not create TER fallback file '{}': {}", externalFile, e.getMessage());
            }
        }

        log.info("Loaded {} TER fallback entries", terFallbacks.size());
    }

    private void loadPropertiesIntoMap(Resource resource, String sourceName) {
        if (resource == null || !resource.exists()) {
            log.warn("TER fallback resource '{}' not found.", sourceName);
            return;
        }
        Properties props = new Properties();
        try (InputStream in = resource.getInputStream()) {
            props.load(in);
            mergeProperties(props, sourceName);
        } catch (Exception e) {
            log.warn("Could not read TER fallback resource '{}': {}", sourceName, e.getMessage());
        }
    }

    private void mergeProperties(Properties props, String sourceName) {
        for (String key : props.stringPropertyNames()) {
            String symbol = key == null ? "" : key.trim().toUpperCase(Locale.ROOT);
            String raw = props.getProperty(key, "").trim();
            if (symbol.isBlank() || raw.isBlank()) {
                continue;
            }
            try {
                terFallbacks.put(symbol, Double.parseDouble(raw));
            } catch (NumberFormatException ex) {
                log.warn("Invalid TER value '{}' for symbol '{}' in {}", raw, symbol, sourceName);
            }
        }
    }

    public Set<String> drainMissingTerSymbols() {
        Set<String> snapshot = new HashSet<>(missingTerSymbols);
        missingTerSymbols.removeAll(snapshot);
        return snapshot;
    }

    public synchronized void upsertTerFallback(String symbol, double ter) {
        if (symbol == null || symbol.isBlank() || ter <= 0) {
            return;
        }
        String normalized = symbol.trim().toUpperCase(Locale.ROOT);
        terFallbacks.put(normalized, ter);
        missingTerSymbols.remove(normalized);

        try {
            Path parent = terFallbackFilePath.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }

            Properties props = new Properties();
            if (Files.exists(terFallbackFilePath)) {
                try (InputStream in = Files.newInputStream(terFallbackFilePath)) {
                    props.load(in);
                }
            }
            props.setProperty(normalized, String.format(Locale.ROOT, "%.2f", ter));

            List<String> lines = new ArrayList<>();
            lines.add("# TER fallback values in percent (e.g. 0.22 = 0.22%)");
            lines.add("# Auto-updated values are persisted by the backend scheduler.");
            lines.add("");
            props.stringPropertyNames().stream()
                    .sorted()
                    .forEach(k -> lines.add(k + "=" + props.getProperty(k)));

            Files.write(terFallbackFilePath, lines, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("Updated TER fallback {}={} in {}", normalized, ter, terFallbackFilePath);
        } catch (Exception e) {
            log.warn("Failed to persist TER fallback for {}: {}", normalized, e.getMessage());
        }
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    public Map<String, Object> getRawResponse(String symbolParam) {
        String url = "https://stooq.com/q/l/?s=" + symbolParam + "&f=sd2t2ohlcvn&e=json";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (compatible; ETFTracker/1.0)");
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }
}
