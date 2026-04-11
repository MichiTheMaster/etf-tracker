package com.etftracker.backend.dto;

import java.math.BigDecimal;

public class BuyEtfRequest {
    public String symbol;
    public Integer quantity;
    public BigDecimal price;

    public BuyEtfRequest() {
    }

    public BuyEtfRequest(String symbol, Integer quantity, BigDecimal price) {
        this.symbol = symbol;
        this.quantity = quantity;
        this.price = price;
    }
}
