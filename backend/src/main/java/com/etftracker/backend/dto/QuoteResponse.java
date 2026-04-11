package com.etftracker.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record QuoteResponse(String symbol, double price, String source, Double ter, Map<String, String> debug) {
    public QuoteResponse(String symbol, double price, String source, Double ter) {
        this(symbol, price, source, ter, null);
    }
}
