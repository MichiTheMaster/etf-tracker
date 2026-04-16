package com.etftracker.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "portfolios")
public class Portfolio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal cash;

    @Column(nullable = false, precision = 8, scale = 6)
    private BigDecimal transactionFeeRate = BigDecimal.ZERO;

    @Column(nullable = false, precision = 8, scale = 6)
    private BigDecimal depotFeeRate = BigDecimal.ZERO;

    @Column
    private LocalDate lastDepotFeeChargedAt;

    @OneToMany(mappedBy = "portfolio", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Position> positions = new HashSet<>();

    @OneToMany(mappedBy = "portfolio", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Transaction> transactions = new HashSet<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public Portfolio() {
    }

    public Portfolio(User user, String name, BigDecimal initialCash) {
        this.user = user;
        this.name = name;
        this.cash = initialCash;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getter & Setter
    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getCash() {
        return cash;
    }

    public void setCash(BigDecimal cash) {
        this.cash = cash;
    }

    public BigDecimal getTransactionFeeRate() {
        return transactionFeeRate;
    }

    public void setTransactionFeeRate(BigDecimal transactionFeeRate) {
        this.transactionFeeRate = transactionFeeRate;
    }

    public BigDecimal getDepotFeeRate() {
        return depotFeeRate;
    }

    public void setDepotFeeRate(BigDecimal depotFeeRate) {
        this.depotFeeRate = depotFeeRate;
    }

    public LocalDate getLastDepotFeeChargedAt() {
        return lastDepotFeeChargedAt;
    }

    public void setLastDepotFeeChargedAt(LocalDate lastDepotFeeChargedAt) {
        this.lastDepotFeeChargedAt = lastDepotFeeChargedAt;
    }

    public Set<Position> getPositions() {
        return positions;
    }

    public void setPositions(Set<Position> positions) {
        this.positions = positions;
    }

    public Set<Transaction> getTransactions() {
        return transactions;
    }

    public void setTransactions(Set<Transaction> transactions) {
        this.transactions = transactions;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
