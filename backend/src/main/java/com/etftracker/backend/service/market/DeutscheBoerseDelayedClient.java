package com.etftracker.backend.service.market;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.zip.GZIPInputStream;

@Component
public class DeutscheBoerseDelayedClient {

    private static final Logger log = LoggerFactory.getLogger(DeutscheBoerseDelayedClient.class);
    private static final String BASE = "https://mfs.deutsche-boerse.com";
    private static final List<String> FEEDS = List.of("DETR-posttrade", "DFRA-posttrade");
    private static final Duration REFRESH_TTL = Duration.ofSeconds(60);
    private static final int MAX_MINUTE_FILES_COLD = 30;
    private static final int MAX_MINUTE_FILES_WARM = 8;
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(4);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(12);

    public record DelayedQuote(double price, Instant tradeTime, String venue, String currency, String feed) {
    }

    private record CachedQuote(double price, Instant tradeTime, String venue, String currency, String feed) {
    }

    private final HttpClient httpClient;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ConcurrentHashMap<String, CachedQuote> lastByIsin = new ConcurrentHashMap<>();
    private final Set<String> ingestedFiles = ConcurrentHashMap.newKeySet();
    private final Object refreshLock = new Object();
    private final ExecutorService ingestExecutor = Executors.newFixedThreadPool(4, runnable -> {
        Thread thread = new Thread(runnable, "dbg-delayed-ingest");
        thread.setDaemon(true);
        return thread;
    });
    private volatile Instant lastRefresh = Instant.EPOCH;
    private final AtomicBoolean refreshScheduled = new AtomicBoolean(false);

    @Value("${app.market.delayed.warmup:true}")
    private boolean warmupEnabled = true;

    public DeutscheBoerseDelayedClient() {
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
    }

    @PostConstruct
    void warmup() {
        if (!warmupEnabled) {
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                refreshIfStale();
            } catch (Exception e) {
                log.warn("Deutsche Boerse delayed warmup failed: {}", e.getMessage());
            }
        }, "dbg-delayed-warmup");
        thread.setDaemon(true);
        thread.start();
    }

    public DelayedQuote fetchLastPrice(String isin) {
        if (isin == null || isin.isBlank()) {
            return null;
        }
        scheduleRefreshIfStale();
        return lookup(isin);
    }

    private void scheduleRefreshIfStale() {
        Instant now = Instant.now();
        if (Duration.between(lastRefresh, now).compareTo(REFRESH_TTL) < 0 && !lastByIsin.isEmpty()) {
            return;
        }
        if (!refreshScheduled.compareAndSet(false, true)) {
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                refreshIfStale();
            } catch (Exception e) {
                log.warn("Deutsche Boerse delayed refresh failed: {}", e.getMessage());
            } finally {
                refreshScheduled.set(false);
            }
        }, "dbg-delayed-refresh");
        thread.setDaemon(true);
        thread.start();
    }

    public Instant nextDelayedAt() {
        Instant now = Instant.now();
        Instant last = lastRefresh;
        if (last == null || Instant.EPOCH.equals(last)) {
            return now.plusSeconds(20);
        }
        Instant next = last.plus(REFRESH_TTL);
        if (next.isAfter(now)) {
            return next;
        }
        return now.plusSeconds(5);
    }

    DelayedQuote lookup(String isin) {
        if (isin == null || isin.isBlank()) {
            return null;
        }
        CachedQuote cached = lastByIsin.get(isin.trim().toUpperCase(Locale.ROOT));
        if (cached == null || cached.price() <= 0) {
            return null;
        }
        return new DelayedQuote(cached.price(), cached.tradeTime(), cached.venue(), cached.currency(), cached.feed());
    }

    void applyLine(String line, String feed) {
        if (line == null || line.isBlank()) {
            return;
        }
        try {
            JsonNode node = mapper.readTree(line);
            String modification = text(node, "mmtModificationInd");
            if (modification != null && "C".equalsIgnoreCase(modification)) {
                return;
            }
            String isin = text(node, "instrumentIdentificationCode");
            if (isin == null || isin.length() < 12) {
                return;
            }
            double price = parsePrice(node.get("price"));
            if (price <= 0) {
                return;
            }
            Instant tradeTime = parseTime(text(node, "tradingDateAndTime"));
            String venue = text(node, "venueOfExecution");
            String currency = text(node, "priceCurrency");
            String key = isin.toUpperCase(Locale.ROOT);
            CachedQuote incoming = new CachedQuote(price, tradeTime, venue, currency, feed);
            lastByIsin.compute(key, (ignored, existing) -> {
                if (existing != null && existing.tradeTime() != null && tradeTime != null
                        && tradeTime.isBefore(existing.tradeTime())) {
                    return existing;
                }
                if (existing != null && tradeTime == null && existing.tradeTime() != null) {
                    return existing;
                }
                return incoming;
            });
        } catch (Exception e) {
            log.debug("Skipped delayed trade line: {}", e.getMessage());
        }
    }

    private void refreshIfStale() {
        Instant now = Instant.now();
        if (Duration.between(lastRefresh, now).compareTo(REFRESH_TTL) < 0 && !lastByIsin.isEmpty()) {
            return;
        }
        synchronized (refreshLock) {
            now = Instant.now();
            if (Duration.between(lastRefresh, now).compareTo(REFRESH_TTL) < 0 && !lastByIsin.isEmpty()) {
                return;
            }
            boolean cold = lastByIsin.isEmpty();
            for (String feed : FEEDS) {
                ingestFeed(feed, cold);
            }
            lastRefresh = Instant.now();
            log.info("Deutsche Boerse delayed cache holds {} ISINs", lastByIsin.size());
        }
    }

    private void ingestFeed(String feed, boolean cold) {
        List<String> files = listFiles(feed);
        if (files.isEmpty()) {
            return;
        }
        int minuteBudget = cold ? MAX_MINUTE_FILES_COLD : MAX_MINUTE_FILES_WARM;
        List<String> dailies = new ArrayList<>();
        List<String> minutes = new ArrayList<>();
        for (String file : files) {
            if (file == null || file.isBlank() || ingestedFiles.contains(file)) {
                continue;
            }
            if (file.contains("-daily-")) {
                if (cold) {
                    dailies.add(file);
                }
                continue;
            }
            if (minutes.size() < minuteBudget) {
                minutes.add(file);
            }
        }
        List<String> toFetch = new ArrayList<>(dailies.size() + minutes.size());
        toFetch.addAll(dailies);
        toFetch.addAll(minutes);
        if (toFetch.isEmpty()) {
            return;
        }
        int ok = 0;
        List<Callable<Boolean>> tasks = new ArrayList<>();
        for (String file : toFetch) {
            tasks.add(() -> ingestFile(file, feed));
        }
        try {
            List<Future<Boolean>> futures = ingestExecutor.invokeAll(tasks, 45, TimeUnit.SECONDS);
            for (Future<Boolean> future : futures) {
                try {
                    if (!future.isCancelled() && Boolean.TRUE.equals(future.get())) {
                        ok += 1;
                    }
                } catch (Exception e) {
                    log.debug("Delayed ingest task failed: {}", e.getMessage());
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Delayed ingest interrupted for {}", feed);
        }
        if (ok > 0) {
            log.info("Ingested {} delayed files from {}", ok, feed);
        }
    }

    private List<String> listFiles(String feed) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BASE + "/api/" + feed))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Accept", "application/json")
                    .header("User-Agent", "ETFTracker/1.0")
                    .GET()
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() / 100 != 2) {
                log.warn("Delayed listing {} HTTP {}", feed, response.statusCode());
                return List.of();
            }
            JsonNode root = mapper.readTree(response.body());
            JsonNode files = root.get("CurrentFiles");
            if (files == null || !files.isArray()) {
                return List.of();
            }
            List<String> names = new ArrayList<>();
            for (JsonNode node : files) {
                if (node != null && node.isTextual() && !node.asText().isBlank()) {
                    names.add(node.asText());
                }
            }
            return names;
        } catch (Exception e) {
            log.warn("Delayed listing failed for {}: {}", feed, e.getMessage());
            return List.of();
        }
    }

    private boolean ingestFile(String filename, String feed) {
        try {
            byte[] body = download(filename);
            if (body == null || body.length == 0) {
                return false;
            }
            ingestBytes(body, feed);
            ingestedFiles.add(filename);
            return true;
        } catch (Exception e) {
            log.debug("Delayed file {} failed: {}", filename, e.getMessage());
            return false;
        }
    }

    private byte[] download(String filename) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE + "/api/download/" + filename))
                .timeout(REQUEST_TIMEOUT)
                .header("User-Agent", "ETFTracker/1.0")
                .GET()
                .build();
        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() / 100 != 2) {
            log.debug("Delayed download {} HTTP {}", filename, response.statusCode());
            return null;
        }
        return response.body();
    }

    private void ingestBytes(byte[] body, String feed) throws Exception {
        InputStream raw = new ByteArrayInputStream(body);
        InputStream in = isGzip(body) ? new GZIPInputStream(raw) : raw;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                applyLine(line, feed);
            }
        }
    }

    private static boolean isGzip(byte[] body) {
        return body != null && body.length >= 2 && body[0] == (byte) 0x1f && body[1] == (byte) 0x8b;
    }

    private static String text(JsonNode node, String field) {
        if (node == null) {
            return null;
        }
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || !value.isValueNode()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text.trim();
    }

    private static double parsePrice(JsonNode node) {
        if (node == null || node.isNull()) {
            return 0;
        }
        if (node.isNumber()) {
            return node.asDouble();
        }
        try {
            return Double.parseDouble(node.asText().trim());
        } catch (Exception ignored) {
            return 0;
        }
    }

    private static Instant parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (Exception ignored) {
            return null;
        }
    }
}
