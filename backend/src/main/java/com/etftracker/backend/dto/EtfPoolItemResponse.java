package com.etftracker.backend.dto;

public class EtfPoolItemResponse {
    private String symbol;
    private String name;
    private String exchange;
    private String currency;
    private Double marketPrice;

    public EtfPoolItemResponse() {
    }

    public EtfPoolItemResponse(String symbol, String name, String exchange, String currency, Double marketPrice) {
        this.symbol = symbol;
        this.name = name;
        this.exchange = exchange;
        this.currency = currency;
        this.marketPrice = marketPrice;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getExchange() {
        return exchange;
    }

    public void setExchange(String exchange) {
        this.exchange = exchange;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Double getMarketPrice() {
        return marketPrice;
    }

    public void setMarketPrice(Double marketPrice) {
        this.marketPrice = marketPrice;
    }
}
