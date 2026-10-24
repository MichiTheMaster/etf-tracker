package com.etftracker.backend.service.market;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class DeutscheBoerseDelayedClientTest {

    private final DeutscheBoerseDelayedClient client = new DeutscheBoerseDelayedClient();

    @Test
    void keepsLatestTradePerIsin() {
        client.applyLine(
                "{\"instrumentIdentificationCode\":\"IE00BK5BQT80\",\"price\":116.2,"
                        + "\"tradingDateAndTime\":\"2026-10-21T10:00:00Z\",\"venueOfExecution\":\"XETR\","
                        + "\"priceCurrency\":\"EUR\",\"mmtModificationInd\":\"-\"}",
                "DETR-posttrade");
        client.applyLine(
                "{\"instrumentIdentificationCode\":\"IE00BK5BQT80\",\"price\":116.5,"
                        + "\"tradingDateAndTime\":\"2026-10-21T10:15:00Z\",\"venueOfExecution\":\"XETR\","
                        + "\"priceCurrency\":\"EUR\",\"mmtModificationInd\":\"-\"}",
                "DETR-posttrade");
        client.applyLine(
                "{\"instrumentIdentificationCode\":\"IE00BK5BQT80\",\"price\":99.0,"
                        + "\"tradingDateAndTime\":\"2026-10-21T09:00:00Z\",\"venueOfExecution\":\"FRAA\","
                        + "\"priceCurrency\":\"EUR\",\"mmtModificationInd\":\"-\"}",
                "DFRA-posttrade");

        DeutscheBoerseDelayedClient.DelayedQuote quote = client.lookup("ie00bk5bqt80");
        assertEquals(116.5, quote.price());
        assertEquals("XETR", quote.venue());
        assertEquals("DETR-posttrade", quote.feed());
    }

    @Test
    void skipsCancelledTrades() {
        client.applyLine(
                "{\"instrumentIdentificationCode\":\"IE00B4L5Y983\",\"price\":12.3,"
                        + "\"tradingDateAndTime\":\"2026-10-21T10:00:00Z\",\"mmtModificationInd\":\"C\"}",
                "DETR-posttrade");
        assertNull(client.lookup("IE00B4L5Y983"));
    }
}
