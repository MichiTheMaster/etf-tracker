package com.etftracker.backend.service.market;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;

@Component
public class OpenFigiClient {

    private static final Logger log = LoggerFactory.getLogger(OpenFigiClient.class);
    private static final Set<String> PREFERRED_EXCH = Set.of("GT", "GY", "GR", "GF", "GM");

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${app.market.openfigi.url:https://api.openfigi.com/v3/mapping}")
    private String mappingUrl;

    @Value("${app.market.openfigi.api-key:}")
    private String apiKey;

    public InstrumentMeta lookup(String isin) {
        if (isin == null || isin.isBlank()) {
            return null;
        }
        String normalized = isin.trim().toUpperCase(Locale.ROOT);
        InstrumentMeta xetra = request(normalized, "XETR");
        if (xetra != null && xetra.ticker() != null) {
            return xetra;
        }
        return request(normalized, null);
    }

    private InstrumentMeta request(String isin, String micCode) {
        try {
            String body = micCode == null
                    ? "[{\"idType\":\"ID_ISIN\",\"idValue\":\"" + isin + "\"}]"
                    : "[{\"idType\":\"ID_ISIN\",\"idValue\":\"" + isin + "\",\"micCode\":\"" + micCode + "\"}]";
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(mappingUrl))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("User-Agent", "ETFTracker/1.0")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
            if (apiKey != null && !apiKey.isBlank()) {
                builder.header("X-OPENFIGI-APIKEY", apiKey.trim());
            }
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("OpenFIGI HTTP {} for {}", response.statusCode(), isin);
                return null;
            }
            return pick(isin, mapper.readTree(response.body()));
        } catch (Exception e) {
            log.warn("OpenFIGI lookup failed for {}: {}", isin, e.getMessage());
            return null;
        }
    }

    private InstrumentMeta pick(String isin, JsonNode root) {
        if (root == null || !root.isArray() || root.isEmpty()) {
            return null;
        }
        JsonNode data = root.get(0).get("data");
        if (data == null || !data.isArray()) {
            return null;
        }
        JsonNode best = null;
        for (JsonNode node : data) {
            String ticker = text(node, "ticker");
            if (!isDisplayTicker(ticker, isin)) {
                continue;
            }
            String exch = text(node, "exchCode");
            if (best == null) {
                best = node;
            }
            if (exch != null && PREFERRED_EXCH.contains(exch.toUpperCase(Locale.ROOT))) {
                best = node;
                break;
            }
        }
        if (best == null) {
            return null;
        }
        return new InstrumentMeta(isin, text(best, "ticker"), text(best, "name"));
    }

    private static boolean isDisplayTicker(String ticker, String isin) {
        if (ticker == null || ticker.isBlank()) {
            return false;
        }
        String normalized = ticker.trim().toUpperCase(Locale.ROOT);
        return normalized.length() <= 8 && !normalized.equals(isin) && normalized.matches("[A-Z0-9.]+");
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text.trim();
    }
}
