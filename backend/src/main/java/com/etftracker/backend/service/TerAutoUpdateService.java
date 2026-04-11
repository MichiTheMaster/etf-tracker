package com.etftracker.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TerAutoUpdateService {

    private static final Logger log = LoggerFactory.getLogger(TerAutoUpdateService.class);

    private static final Pattern EXPENSE_RATIO_PATTERN = Pattern.compile(
            "Expense Ratio\\s*([0-9]+(?:\\.[0-9]+)?)%",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private final RestTemplate restTemplate = new RestTemplate();
    private final MarketDataService marketDataService;
    private final AtomicBoolean updateRunning = new AtomicBoolean(false);

    public TerAutoUpdateService(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void updateMissingTerFallbacksOnStartup() {
        runUpdate("startup");
    }

    @Scheduled(cron = "${ter.autoupdate.cron:0 30 2 * * *}")
    public void updateMissingTerFallbacksCron() {
        runUpdate("cron");
    }

    @Scheduled(fixedDelayString = "${ter.autoupdate.fixed-delay-ms:21600000}", initialDelayString = "${ter.autoupdate.fixed-initial-delay-ms:900000}")
    public void updateMissingTerFallbacksFixedDelay() {
        runUpdate("fixed-delay");
    }

    private void runUpdate(String trigger) {
        if (!updateRunning.compareAndSet(false, true)) {
            log.info("TER auto-update skipped (already running), trigger={}", trigger);
            return;
        }

        try {
            updateMissingTerFallbacks(trigger);
        } finally {
            updateRunning.set(false);
        }
    }

    private void updateMissingTerFallbacks(String trigger) {
        Set<String> missingSymbols = marketDataService.drainMissingTerSymbols();
        if (missingSymbols.isEmpty()) {
            log.debug("TER auto-update: no missing symbols, trigger={}", trigger);
            return;
        }

        log.info("TER auto-update started for {} missing symbols (trigger={})", missingSymbols.size(), trigger);
        int updated = 0;

        for (String symbol : missingSymbols) {
            Double ter = fetchTerFromEtfDb(symbol);
            if (ter == null) {
                continue;
            }
            marketDataService.upsertTerFallback(symbol, ter);
            updated++;
        }

        log.info("TER auto-update finished. Updated {}/{} symbols (trigger={})", updated, missingSymbols.size(),
                trigger);
    }

    private Double fetchTerFromEtfDb(String symbol) {
        String normalized = symbol == null ? "" : symbol.trim().toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return null;
        }

        String url = "https://etfdb.com/etf/" + normalized + "/";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (compatible; ETFTracker/1.0)");
            headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            String body = response.getBody();
            if (body == null || body.isBlank()) {
                return null;
            }

            Matcher matcher = EXPENSE_RATIO_PATTERN.matcher(body);
            if (!matcher.find()) {
                return null;
            }

            return Double.parseDouble(matcher.group(1));
        } catch (Exception e) {
            log.debug("Could not auto-fetch TER for {}: {}", normalized, e.getMessage());
            return null;
        }
    }
}
