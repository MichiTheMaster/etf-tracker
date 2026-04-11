package com.etftracker.backend.dto;

import java.math.BigDecimal;

public class SellEtfRequest {
    public String symbol;
    public Integer quantity;
    public BigDecimal price;

    public SellEtfRequest() {
    }

    public SellEtfRequest(String symbol, Integer quantity, BigDecimal price) {
        this.symbol = symbol;
        this.quantity = quantity;
        this.price = price;
    }
}
