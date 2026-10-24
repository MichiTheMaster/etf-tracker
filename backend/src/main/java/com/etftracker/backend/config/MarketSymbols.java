package com.etftracker.backend.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

public final class MarketSymbols {

    private static final Pattern SYMBOL = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,15}$");
    private static final int MAX_SYMBOLS = 20;

    private MarketSymbols() {
    }

    public static List<String> parse(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        List<String> parsed = new ArrayList<>();
        for (String raw : csv.split(",")) {
            if (raw == null) {
                continue;
            }
            String symbol = raw.trim().toUpperCase(Locale.ROOT);
            if (symbol.isBlank() || !SYMBOL.matcher(symbol).matches()) {
                continue;
            }
            if (!parsed.contains(symbol)) {
                parsed.add(symbol);
            }
            if (parsed.size() >= MAX_SYMBOLS) {
                break;
            }
        }
        return parsed;
    }
}
