package com.etftracker.backend.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MarketSymbolsTest {

    @Test
    void keepsSafeTickers() {
        assertEquals(List.of("VWCE", "SXR8"), MarketSymbols.parse("vwce, SXR8"));
    }

    @Test
    void dropsUnsafeInput() {
        List<String> parsed = MarketSymbols.parse("VWCE, http://evil, ../../etc, VWCE.DE");
        assertEquals(List.of("VWCE", "VWCE.DE"), parsed);
    }

    @Test
    void capsBatchSize() {
        StringBuilder csv = new StringBuilder("A");
        for (int i = 1; i < 40; i++) {
            csv.append(",A").append(i);
        }
        assertEquals(20, MarketSymbols.parse(csv.toString()).size());
    }

    @Test
    void emptyWhenBlank() {
        assertTrue(MarketSymbols.parse("   ").isEmpty());
    }
}
