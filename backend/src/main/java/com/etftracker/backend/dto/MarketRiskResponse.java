package com.etftracker.backend.dto;

public record MarketRiskResponse(
        String symbol,
        Double volatilityPct,
        Double drawdownPct,
        Integer riskScore,
        String riskLevel,
        Integer sampleDays) {
}