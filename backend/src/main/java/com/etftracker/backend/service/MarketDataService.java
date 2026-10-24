package com.etftracker.backend.service;

import com.etftracker.backend.dto.EtfPoolItemResponse;
import com.etftracker.backend.dto.MarketQuoteSettingsResponse;
import com.etftracker.backend.dto.MarketRiskResponse;
import com.etftracker.backend.dto.QuoteResponse;
import com.etftracker.backend.entity.MarketCache;
import com.etftracker.backend.repository.MarketCacheRepository;
import com.etftracker.backend.service.market.DeutscheBoerseDelayedClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    private final AppSettingService appSettingService;
    private final MarketCacheRepository marketCacheRepository;
    private final DeutscheBoerseDelayedClient delayedQuoteClient;
    private final ExecutorService refreshExecutor = Executors.newFixedThreadPool(2, runnable -> {
        Thread thread = new Thread(runnable, "market-cache-refresh");
        thread.setDaemon(true);
        return thread;
    });
    private final Set<String> inFlightQuoteRefresh = ConcurrentHashMap.newKeySet();

    private static final String QUOTE_REFRESH_MINUTES_KEY = "market.quoteRefreshMinutes";

    @Value("${app.market.cache.quote-stale-ms:1800000}")
    private long quoteStaleMs;

    @Value("${app.market.cache.ter-ttl-ms:604800000}")
    private long terTtlMs;

    @Value("${app.market.fallback-prices-enabled:true}")
    private boolean fallbackPricesEnabledDefault;

    private record CacheEntry(double price, long timestamp, Double ter, String provider, String providerSymbol,
            String terSource, Instant asOf) {
    }

    private record TerLookup(Double ter, String source) {
    }

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final Set<String> missingTerSymbols = ConcurrentHashMap.newKeySet();

    private static final Map<String, String> SYMBOL_ALIASES = Map.of();

    private static final Map<String, String> KNOWN_ISINS = Map.ofEntries(
            Map.entry("VWCE", "IE00BK5BQT80"),
            Map.entry("EUNL", "IE00B4L5Y983"),
            Map.entry("SXR8", "IE00B5BMR087"),
            Map.entry("CSPX", "IE00B5BMR087"),
            Map.entry("VUSA", "IE00B3XXRP09"),
            Map.entry("IUSN", "IE00BF4RFH31"),
            Map.entry("EMIM", "IE00BKM4GZ66"),
            Map.entry("EIMI", "IE00BKM4GZ66"),
            Map.entry("IS3N", "IE00BKM4GZ66"),
            Map.entry("SPYD", "US78468R7722"),
            Map.entry("EXSA", "DE0002635307"));

    private static final Map<String, Double> FALLBACK_DEFAULTS = Map.ofEntries(
            Map.entry("SPY", 520.0),
            Map.entry("VWCE", 116.2),
            Map.entry("EUNL", 89.45),
            Map.entry("EMIM", 33.8),
            Map.entry("IS3N", 33.8),
            Map.entry("SXR8", 520.9),
            Map.entry("EXSA", 50.4),
            Map.entry("SPYD", 62.7),
            Map.entry("VUSA", 95.8),
            Map.entry("CSPX", 560.1),
            Map.entry("IUSN", 54.2),
            Map.entry("EIMI", 35.7));

    private static final Map<String, Double> TER_FALLBACK_DEFAULTS = Map.ofEntries(
            Map.entry("VWCE", 0.22),
            Map.entry("EUNL", 0.20),
            Map.entry("EMIM", 0.18),
            Map.entry("IS3N", 0.18),
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
            new EtfPoolItemResponse("IS3N", "iShares Core MSCI EM IMI UCITS ETF Acc", "XETRA", "EUR", 33.8),
            new EtfPoolItemResponse("EMIM", "iShares Core MSCI EM IMI UCITS ETF Acc", "LSE", "GBP", 33.8),
            new EtfPoolItemResponse("SXR8", "iShares Core S&P 500 UCITS ETF", "XETRA", "EUR", 520.9),
            new EtfPoolItemResponse("EXSA", "iShares STOXX Europe 600 UCITS ETF", "XETRA", "EUR", 50.4),
            new EtfPoolItemResponse("SPYD", "SPDR S&P U.S. Dividend Aristocrats ETF", "NYSE", "USD", 62.7),
            new EtfPoolItemResponse("VUSA", "Vanguard S&P 500 UCITS ETF", "XETRA", "EUR", 95.8),
            new EtfPoolItemResponse("CSPX", "iShares Core S&P 500 UCITS ETF", "LSE", "USD", 560.1),
            new EtfPoolItemResponse("IUSN", "iShares MSCI World Small Cap UCITS ETF", "XETRA", "EUR", 54.2),
            new EtfPoolItemResponse("EIMI", "iShares Core MSCI Emerging Markets IMI UCITS ETF Acc", "LSE", "USD", 35.7));

    public MarketDataService(
            AppSettingService appSettingService,
            MarketCacheRepository marketCacheRepository,
            DeutscheBoerseDelayedClient delayedQuoteClient,
            @Value("classpath:ter-fallbacks.properties") Resource terFallbackResource,
            @Value("${ter.fallback.file:./ter-fallbacks.properties}") String terFallbackFile) {
        this.appSettingService = appSettingService;
        this.marketCacheRepository = marketCacheRepository;
        this.delayedQuoteClient = delayedQuoteClient;
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
        List<String> background = new ArrayList<>();
        long now = System.currentTimeMillis();
        List<String> requested = symbols.stream()
                .map(symbol -> symbol == null ? "" : symbol.trim())
                .filter(symbol -> !symbol.isBlank())
                .toList();

        Map<String, MarketCache> persisted = loadPersisted(requested);

        for (String sym : requested) {
            if (forceRefresh) {
                toFetch.add(sym);
                continue;
            }

            CacheEntry memory = cache.get(sym);
            if (memory != null && (now - memory.timestamp()) < quoteTtlMs()) {
                result.put(sym, overlayDelayed(sym, memory, "cached", debugEnabled, now));
                continue;
            }

            MarketCache row = persisted.get(sym.toUpperCase(Locale.ROOT));
            if (row != null && row.getPrice() != null && row.getPrice() > 0) {
                long age = ageMs(row.getQuoteFetchedAt(), now);
                if (age < quoteStaleMs) {
                    CacheEntry hydrated = hydrateMemory(sym, row, now);
                    result.put(sym, overlayDelayed(sym, hydrated, "cached", debugEnabled, now));
                    if (age >= quoteTtlMs()) {
                        background.add(sym);
                    }
                    continue;
                }
            }
            toFetch.add(sym);
        }

        if (!toFetch.isEmpty()) {
            fetchFromDelayed(toFetch, result, debugEnabled);
            persistQuotes(toFetch, result, persisted);
        }

        background.forEach(this::scheduleQuoteRefresh);
        return result;
    }

    public MarketQuoteSettingsResponse quoteRefreshSettings() {
        int minutes = quoteRefreshMinutes();
        Instant now = Instant.now();
        Instant nextDelayed = delayedQuoteClient.nextDelayedAt();
        Instant intervalEnd = now.plusSeconds(minutes * 60L);
        Instant delayedCap = now.plusSeconds(60);
        Instant first = nextDelayed.isAfter(now) && !nextDelayed.isAfter(delayedCap) && !nextDelayed.isAfter(intervalEnd)
                ? nextDelayed
                : intervalEnd;
        String nextDelayedAt = nextDelayed.truncatedTo(ChronoUnit.MILLIS).toString();
        String firstRefreshAt = first.truncatedTo(ChronoUnit.MILLIS).toString();
        return new MarketQuoteSettingsResponse(minutes, minutes * 60, nextDelayedAt, firstRefreshAt);
    }

    private int quoteRefreshMinutes() {
        return appSettingService.getInt(QUOTE_REFRESH_MINUTES_KEY, 5, 1, 15);
    }

    private long quoteTtlMs() {
        return quoteRefreshMinutes() * 60_000L;
    }

    private QuoteResponse overlayDelayed(String symbol, CacheEntry entry, String source, boolean debugEnabled,
            long now) {
        QuoteResponse current = quoteFromEntry(symbol, entry, source, debugEnabled);
        if (entry == null) {
            return current;
        }
        String isin = entry.providerSymbol();
        if (isin == null || isin.length() < 12) {
            isin = resolveIsin(symbol);
        }
        DeutscheBoerseDelayedClient.DelayedQuote delayed = delayedQuoteClient.fetchLastPrice(isin);
        if (delayed == null) {
            return current;
        }
        if (entry.asOf() != null && delayed.tradeTime() != null && !delayed.tradeTime().isAfter(entry.asOf())) {
            return current;
        }
        Instant asOf = delayed.tradeTime() != null ? delayed.tradeTime() : Instant.ofEpochMilli(now);
        CacheEntry updated = new CacheEntry(delayed.price(), now, entry.ter(), "dbg-delayed", isin, entry.terSource(),
                asOf);
        cache.put(symbol, updated);
        return quoteFromEntry(symbol, updated, "delayed", debugEnabled);
    }

    public Map<String, MarketRiskResponse> getRiskMetrics(List<String> symbols) {
        return new LinkedHashMap<>();
    }

    public List<EtfPoolItemResponse> searchEtfs(String query, int limit) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }
        String q = query.trim().toUpperCase(Locale.ROOT);
        List<String> tokens = Arrays.stream(q.split("\\s+"))
                .filter(token -> token.length() >= 2)
                .toList();
        return ETF_POOL_FALLBACK.stream()
                .filter(item -> matchesPoolQuery(item, q, tokens))
                .limit(Math.max(1, limit))
                .toList();
    }

    private boolean matchesPoolQuery(EtfPoolItemResponse item, String query, List<String> tokens) {
        String haystack = poolSearchHaystack(item);
        if (haystack.contains(query)) {
            return true;
        }
        return !tokens.isEmpty() && tokens.stream().allMatch(haystack::contains);
    }

    private String poolSearchHaystack(EtfPoolItemResponse item) {
        String symbol = item.getSymbol() == null ? "" : item.getSymbol();
        String name = item.getName() == null ? "" : item.getName();
        String isin = KNOWN_ISINS.getOrDefault(symbol.toUpperCase(Locale.ROOT), "");
        return (symbol + " " + name + " " + isin).toUpperCase(Locale.ROOT);
    }

    private void fetchFromDelayed(List<String> symbols, Map<String, QuoteResponse> result, boolean debugEnabled) {
        boolean fallbackPricesEnabled = isFallbackPricesEnabled();
        Map<String, Double> fallbackPrices = getFallbackPrices();
        long now = System.currentTimeMillis();
        for (String symbol : symbols) {
            putDelayedOrFallback(symbol, result, now, debugEnabled, fallbackPricesEnabled, fallbackPrices);
        }
        for (String sym : symbols) {
            if (result.containsKey(sym)) {
                continue;
            }
            if (fallbackPricesEnabled) {
                String canonical = canonicalSymbol(sym);
                result.put(sym, createQuote(sym,
                        fallbackPrices.getOrDefault(sym.toUpperCase(Locale.ROOT),
                                fallbackPrices.getOrDefault(canonical, 0.0)),
                        "fallback", resolveTer(sym, null), debugEnabled,
                        "fallback", "fallback-static", "fallback"));
            } else {
                result.put(sym, createQuote(sym, 0.0, "unavailable", resolveTer(sym, null), debugEnabled,
                        "unavailable", "-", "-"));
            }
        }
    }

    private void putDelayedOrFallback(String symbol, Map<String, QuoteResponse> result, long now,
            boolean debugEnabled, boolean fallbackPricesEnabled, Map<String, Double> fallbackPrices) {
        String isin = resolveIsin(symbol);
        DeutscheBoerseDelayedClient.DelayedQuote delayed = delayedQuoteClient.fetchLastPrice(isin);
        if (delayed != null) {
            TerLookup terLookup = resolveLiveTer(symbol);
            Instant asOf = delayed.tradeTime() != null ? delayed.tradeTime() : Instant.ofEpochMilli(now);
            cache.put(symbol, new CacheEntry(delayed.price(), now, terLookup.ter(), "dbg-delayed",
                    isin, terLookup.source(), asOf));
            result.put(symbol, createQuote(symbol, delayed.price(), "delayed", terLookup.ter(), debugEnabled,
                    "dbg-delayed", isin, terLookup.source(), asOf));
            return;
        }
        if (!fallbackPricesEnabled) {
            result.put(symbol, createQuote(symbol, 0.0, "unavailable",
                    resolveTer(symbol, null), debugEnabled, "unavailable", "-", "-"));
            return;
        }
        String canonical = canonicalSymbol(symbol);
        double fallbackPrice = fallbackPrices.getOrDefault(symbol.toUpperCase(Locale.ROOT),
                fallbackPrices.getOrDefault(canonical, 0.0));
        result.put(symbol, createQuote(symbol, fallbackPrice, "fallback",
                resolveTer(symbol, null), debugEnabled, "fallback", "fallback-static", "fallback"));
    }

    private String canonicalSymbol(String symbol) {
        if (symbol == null) {
            return "";
        }

        String normalized = symbol.trim().toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return normalized;
        }

        String base = normalized;
        int dotPos = normalized.indexOf('.');
        if (dotPos > 0) {
            // Exchange-qualified symbols (e.g. SXRS.DU) must stay exact and should not be
            // remapped via alias.
            return normalized;
        }

        return getSymbolAliases().getOrDefault(base, base);
    }

    private Map<String, String> getSymbolAliases() {
        Map<String, String> aliases = new HashMap<>(SYMBOL_ALIASES);
        aliases.putAll(appSettingService.getMarketAliases());
        return aliases;
    }

    private Map<String, Double> getFallbackPrices() {
        Map<String, Double> fallbackPrices = new HashMap<>(FALLBACK_DEFAULTS);
        fallbackPrices.putAll(appSettingService.getMarketFallbackPrices());
        return fallbackPrices;
    }

    private boolean isFallbackPricesEnabled() {
        return appSettingService.getBoolean("market.fallbackPricesEnabled", fallbackPricesEnabledDefault);
    }

    private TerLookup resolveLiveTer(String symbol) {
        Double cachedTer = resolveTer(symbol, null);
        MarketCache row = loadOne(symbol);
        if (row != null && row.getTer() != null && row.getTer() > 0
                && ageMs(row.getTerFetchedAt(), System.currentTimeMillis()) < terTtlMs) {
            return new TerLookup(row.getTer(), row.getTerSource() != null ? row.getTerSource() : "cached");
        }
        return new TerLookup(cachedTer, cachedTer != null ? "fallback" : null);
    }

    private Map<String, MarketCache> loadPersisted(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return Map.of();
        }
        List<String> keys = symbols.stream()
                .map(symbol -> symbol.toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
        Map<String, MarketCache> bySymbol = new HashMap<>();
        for (MarketCache row : marketCacheRepository.findAllById(keys)) {
            bySymbol.put(row.getSymbol(), row);
        }
        return bySymbol;
    }

    private MarketCache loadOne(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return null;
        }
        return marketCacheRepository.findById(symbol.trim().toUpperCase(Locale.ROOT)).orElse(null);
    }

    private void persistQuotes(List<String> symbols, Map<String, QuoteResponse> result,
            Map<String, MarketCache> existing) {
        for (String symbol : symbols) {
            QuoteResponse quote = result.get(symbol);
            if (quote == null || quote.price() <= 0) {
                continue;
            }
            CacheEntry entry = cache.get(symbol);
            String key = symbol.toUpperCase(Locale.ROOT);
            MarketCache row = existing.getOrDefault(key, new MarketCache(key));
            row.setPrice(quote.price());
            row.setQuoteFetchedAt(Instant.now());
            if (entry != null) {
                row.setPriceProvider(entry.provider());
                row.setProviderSymbol(entry.providerSymbol());
                row.setTer(entry.ter());
                row.setTerSource(entry.terSource());
                if (entry.ter() != null && entry.ter() > 0) {
                    row.setTerFetchedAt(Instant.now());
                }
                if ("dbg-delayed".equals(entry.provider()) && entry.providerSymbol() != null
                        && entry.providerSymbol().length() >= 12) {
                    row.setIsin(entry.providerSymbol());
                }
            }
            if (row.getIsin() == null) {
                row.setIsin(resolveIsin(symbol));
            }
            marketCacheRepository.save(row);
        }
    }

    private CacheEntry hydrateMemory(String symbol, MarketCache row, long now) {
        Instant asOf = row.getQuoteFetchedAt() != null ? row.getQuoteFetchedAt() : Instant.ofEpochMilli(now);
        CacheEntry entry = new CacheEntry(
                row.getPrice(),
                now,
                row.getTer(),
                row.getPriceProvider(),
                row.getProviderSymbol(),
                row.getTerSource(),
                asOf);
        cache.put(symbol, entry);
        return entry;
    }

    private QuoteResponse quoteFromEntry(String symbol, CacheEntry entry, String source, boolean debugEnabled) {
        return createQuote(symbol, entry.price(), source, resolveTer(symbol, entry.ter()), debugEnabled,
                entry.provider(), entry.providerSymbol(), entry.terSource(), entry.asOf());
    }

    private long ageMs(Instant fetchedAt, long nowMs) {
        if (fetchedAt == null) {
            return Long.MAX_VALUE;
        }
        return Math.max(0, nowMs - fetchedAt.toEpochMilli());
    }

    private String resolveIsin(String symbol) {
        MarketCache row = loadOne(symbol);
        if (row != null && row.getIsin() != null && !row.getIsin().isBlank()) {
            return row.getIsin();
        }
        String canonical = canonicalSymbol(symbol);
        String known = KNOWN_ISINS.get(canonical);
        if (known != null) {
            return known;
        }
        if (canonical.length() == 12) {
            return canonical;
        }
        return null;
    }

    private void scheduleQuoteRefresh(String symbol) {
        if (!inFlightQuoteRefresh.add(symbol)) {
            return;
        }
        refreshExecutor.execute(() -> {
            try {
                getQuotes(List.of(symbol), true, false);
            } catch (Exception e) {
                log.debug("Background quote refresh failed for {}: {}", symbol, e.getMessage());
            } finally {
                inFlightQuoteRefresh.remove(symbol);
            }
        });
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
        return createQuote(symbol, price, source, ter, debugEnabled, provider, providerSymbol, terSource, Instant.now());
    }

    private QuoteResponse createQuote(
            String symbol,
            double price,
            String source,
            Double ter,
            boolean debugEnabled,
            String provider,
            String providerSymbol,
            String terSource,
            Instant asOf) {
        Instant resolvedAsOf = (asOf != null ? asOf : Instant.now()).truncatedTo(ChronoUnit.MILLIS);
        String asOfValue = resolvedAsOf.toString();
        if (!debugEnabled) {
            return new QuoteResponse(symbol, price, source, ter, asOfValue, null);
        }

        Map<String, String> debug = new LinkedHashMap<>();
        debug.put("provider", provider == null ? "-" : provider);
        debug.put("providerSymbol", providerSymbol == null ? "-" : providerSymbol);
        debug.put("terSource", terSource == null ? "-" : terSource);

        return new QuoteResponse(symbol, price, source, ter, asOfValue, debug);
    }

    private void useFallback(List<String> symbols, Map<String, QuoteResponse> result) {
        for (String sym : symbols) {
            result.computeIfAbsent(sym,
                    s -> createQuote(s, FALLBACK_DEFAULTS.getOrDefault(s, 0.0), "fallback", resolveTer(s, null), false,
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
        String canonical = canonicalSymbol(normalized);
        Double fallbackTer = terFallbacks.get(normalized);
        if (fallbackTer == null) {
            fallbackTer = terFallbacks.get(canonical);
        }
        if (fallbackTer == null) {
            missingTerSymbols.add(canonical);
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
            lines.add("# Maintain values manually. External TER scrapes are disabled.");
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

    public Map<String, Object> getRawResponse(String symbolParam) {
        if (symbolParam == null || symbolParam.isBlank()) {
            return Map.of("error", "invalid-symbol");
        }
        String isin = resolveIsin(symbolParam);
        DeutscheBoerseDelayedClient.DelayedQuote delayed = delayedQuoteClient.fetchLastPrice(isin);
        if (delayed == null) {
            return Map.of("symbol", symbolParam, "isin", isin == null ? "" : isin, "source", "delayed", "found", false);
        }
        return Map.of(
                "symbol", symbolParam,
                "isin", isin == null ? "" : isin,
                "source", "delayed",
                "found", true,
                "price", delayed.price(),
                "asOf", delayed.tradeTime() == null ? "" : delayed.tradeTime().toString(),
                "venue", delayed.venue() == null ? "" : delayed.venue(),
                "feed", delayed.feed() == null ? "" : delayed.feed());
    }
}
