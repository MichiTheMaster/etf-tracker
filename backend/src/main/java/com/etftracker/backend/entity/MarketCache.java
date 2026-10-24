package com.etftracker.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "market_cache")
public class MarketCache {

    @Id
    @Column(name = "symbol", nullable = false, length = 32)
    private String symbol;

    @Column(length = 16)
    private String isin;

    @Column
    private Double price;

    @Column(length = 32)
    private String priceProvider;

    @Column(length = 64)
    private String providerSymbol;

    @Column
    private Double ter;

    @Column(length = 64)
    private String terSource;

    @Column
    private Double volatilityPct;

    @Column
    private Double drawdownPct;

    @Column
    private Integer riskScore;

    @Column(length = 32)
    private String riskLevel;

    @Column
    private Integer riskSampleDays;

    @Column
    private Instant quoteFetchedAt;

    @Column
    private Instant terFetchedAt;

    @Column
    private Instant riskFetchedAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public MarketCache() {
    }

    public MarketCache(String symbol) {
        this.symbol = symbol;
    }

    @PrePersist
    @PreUpdate
    public void touch() {
        this.updatedAt = Instant.now();
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getIsin() {
        return isin;
    }

    public void setIsin(String isin) {
        this.isin = isin;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public String getPriceProvider() {
        return priceProvider;
    }

    public void setPriceProvider(String priceProvider) {
        this.priceProvider = priceProvider;
    }

    public String getProviderSymbol() {
        return providerSymbol;
    }

    public void setProviderSymbol(String providerSymbol) {
        this.providerSymbol = providerSymbol;
    }

    public Double getTer() {
        return ter;
    }

    public void setTer(Double ter) {
        this.ter = ter;
    }

    public String getTerSource() {
        return terSource;
    }

    public void setTerSource(String terSource) {
        this.terSource = terSource;
    }

    public Double getVolatilityPct() {
        return volatilityPct;
    }

    public void setVolatilityPct(Double volatilityPct) {
        this.volatilityPct = volatilityPct;
    }

    public Double getDrawdownPct() {
        return drawdownPct;
    }

    public void setDrawdownPct(Double drawdownPct) {
        this.drawdownPct = drawdownPct;
    }

    public Integer getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(Integer riskScore) {
        this.riskScore = riskScore;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public Integer getRiskSampleDays() {
        return riskSampleDays;
    }

    public void setRiskSampleDays(Integer riskSampleDays) {
        this.riskSampleDays = riskSampleDays;
    }

    public Instant getQuoteFetchedAt() {
        return quoteFetchedAt;
    }

    public void setQuoteFetchedAt(Instant quoteFetchedAt) {
        this.quoteFetchedAt = quoteFetchedAt;
    }

    public Instant getTerFetchedAt() {
        return terFetchedAt;
    }

    public void setTerFetchedAt(Instant terFetchedAt) {
        this.terFetchedAt = terFetchedAt;
    }

    public Instant getRiskFetchedAt() {
        return riskFetchedAt;
    }

    public void setRiskFetchedAt(Instant riskFetchedAt) {
        this.riskFetchedAt = riskFetchedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
