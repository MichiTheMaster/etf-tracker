package com.etftracker.backend.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.List;

public class PortfolioResponse {
    public BigDecimal cash;
    public Map<String, HoldingDTO> holdings;
    public List<TransactionDTO> transactions;

    public PortfolioResponse(BigDecimal cash, Map<String, HoldingDTO> holdings, List<TransactionDTO> transactions) {
        this.cash = cash;
        this.holdings = holdings;
        this.transactions = transactions;
    }

    public static class HoldingDTO {
        public Integer shares;
        public BigDecimal costTotal;
        public String addedAt;

        public HoldingDTO(Integer shares, BigDecimal costTotal, String addedAt) {
            this.shares = shares;
            this.costTotal = costTotal;
            this.addedAt = addedAt;
        }
    }

    public static class TransactionDTO {
        public Long id;
        public String type;
        public String symbol;
        public Integer quantity;
        public BigDecimal price;
        public BigDecimal total;
        public BigDecimal realizedProfit;
        public String timestamp;

        public TransactionDTO(Long id, String type, String symbol, Integer quantity,
                BigDecimal price, BigDecimal total, BigDecimal realizedProfit, String timestamp) {
            this.id = id;
            this.type = type;
            this.symbol = symbol;
            this.quantity = quantity;
            this.price = price;
            this.total = total;
            this.realizedProfit = realizedProfit;
            this.timestamp = timestamp;
        }
    }
}
