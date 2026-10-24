package com.etftracker.backend.dto;

public record MarketQuoteSettingsResponse(
        int quoteRefreshMinutes,
        int quoteRefreshSeconds,
        String nextDelayedAt,
        String firstRefreshAt) {
}
