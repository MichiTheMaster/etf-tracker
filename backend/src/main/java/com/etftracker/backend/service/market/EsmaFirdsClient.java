package com.etftracker.backend.service.market;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class EsmaFirdsClient {

    private static final Logger log = LoggerFactory.getLogger(EsmaFirdsClient.class);
    private static final Pattern NAME_BLOCK = Pattern.compile(
            "<FinInstrmGnlAttrbts>\\s*<Id>([A-Z0-9]{12})</Id>\\s*<FullNm>([^<]+)</FullNm>");

    private final ConcurrentHashMap<String, String> namesByIsin = new ConcurrentHashMap<>();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .connectTimeout(Duration.ofSeconds(6))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${app.market.firds.enabled:true}")
    private boolean enabled;

    @Value("${app.market.firds.index-url:https://registers.esma.europa.eu/solr/esma_registers_firds_files/select?q=file_type:FULINS%20AND%20file_name:FULINS_C_*&sort=publication_date%20desc&rows=1&wt=json}")
    private String indexUrl;

    @PostConstruct
    void warmup() {
        if (!enabled) {
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                refresh();
            } catch (Exception e) {
                log.warn("ESMA FIRDS warmup failed: {}", e.getMessage());
            }
        }, "esma-firds-warmup");
        thread.setDaemon(true);
        thread.start();
    }

    public String nameOf(String isin) {
        if (isin == null || isin.isBlank()) {
            return null;
        }
        return namesByIsin.get(isin.trim().toUpperCase(Locale.ROOT));
    }

    private void refresh() throws Exception {
        String downloadLink = latestDownloadLink();
        if (downloadLink == null) {
            log.warn("ESMA FIRDS file index returned no FULINS_C download");
            return;
        }
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(downloadLink))
                .timeout(Duration.ofSeconds(45))
                .header("User-Agent", "ETFTracker/1.0")
                .GET()
                .build();
        HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() / 100 != 2) {
            log.warn("ESMA FIRDS download HTTP {}", response.statusCode());
            return;
        }
        int loaded = 0;
        try (InputStream raw = response.body();
             ZipInputStream zip = new ZipInputStream(new BufferedInputStream(raw))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.getName() != null && entry.getName().toLowerCase(Locale.ROOT).endsWith(".xml")) {
                    loaded += parseNames(zip);
                }
                zip.closeEntry();
            }
        }
        log.info("ESMA FIRDS cached {} instrument names", loaded);
    }

    private String latestDownloadLink() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(indexUrl))
                .timeout(Duration.ofSeconds(12))
                .header("Accept", "application/json")
                .header("User-Agent", "ETFTracker/1.0")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            return null;
        }
        JsonNode docs = mapper.readTree(response.body()).path("response").path("docs");
        if (!docs.isArray() || docs.isEmpty()) {
            return null;
        }
        JsonNode link = docs.get(0).get("download_link");
        return link == null || link.asText().isBlank() ? null : link.asText();
    }

    private int parseNames(InputStream xml) throws Exception {
        ByteArrayOutputStream tail = new ByteArrayOutputStream();
        byte[] buf = new byte[16_384];
        int read;
        int added = 0;
        while ((read = xml.read(buf)) >= 0) {
            tail.write(buf, 0, read);
            String chunk = tail.toString(StandardCharsets.UTF_8);
            Matcher matcher = NAME_BLOCK.matcher(chunk);
            int consumed = 0;
            while (matcher.find()) {
                String isin = matcher.group(1);
                String name = unescape(matcher.group(2));
                if (namesByIsin.putIfAbsent(isin, name) == null) {
                    added += 1;
                }
                consumed = matcher.end();
            }
            if (consumed > 0) {
                String leftover = chunk.substring(consumed);
                tail.reset();
                tail.write(leftover.getBytes(StandardCharsets.UTF_8));
            } else if (tail.size() > 2_000_000) {
                byte[] keep = tail.toByteArray();
                int start = Math.max(0, keep.length - 8_192);
                tail.reset();
                tail.write(keep, start, keep.length - start);
            }
        }
        return added;
    }

    private static String unescape(String value) {
        return value.replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&apos;", "'")
                .trim();
    }
}
