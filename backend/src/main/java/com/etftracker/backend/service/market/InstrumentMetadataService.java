package com.etftracker.backend.service.market;

import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class InstrumentMetadataService {

    private final OpenFigiClient openFigiClient;
    private final EsmaFirdsClient esmaFirdsClient;
    private final ConcurrentHashMap<String, InstrumentMeta> cache = new ConcurrentHashMap<>();

    public InstrumentMetadataService(OpenFigiClient openFigiClient, EsmaFirdsClient esmaFirdsClient) {
        this.openFigiClient = openFigiClient;
        this.esmaFirdsClient = esmaFirdsClient;
    }

    public InstrumentMeta lookup(String isin) {
        if (isin == null || isin.isBlank()) {
            return null;
        }
        String key = isin.trim().toUpperCase(Locale.ROOT);
        InstrumentMeta cached = cache.get(key);
        if (cached != null && cached.ticker() != null && cached.name() != null) {
            return cached;
        }
        String firdsName = esmaFirdsClient.nameOf(key);
        InstrumentMeta figi = openFigiClient.lookup(key);
        String ticker = figi != null ? figi.ticker() : cached != null ? cached.ticker() : null;
        String name = firstNonBlank(firdsName, figi != null ? figi.name() : null,
                cached != null ? cached.name() : null);
        if (ticker == null && name == null) {
            return cached;
        }
        InstrumentMeta meta = new InstrumentMeta(key, ticker, name);
        cache.put(key, meta);
        return meta;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
