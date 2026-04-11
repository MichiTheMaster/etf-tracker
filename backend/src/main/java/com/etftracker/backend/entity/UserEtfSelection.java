package com.etftracker.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_etf_selections", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "symbol" })
})
public class UserEtfSelection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 32)
    private String symbol;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal ter = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean selected;

    @Column(nullable = false)
    private boolean custom;

    @Column(length = 32)
    private String source;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public UserEtfSelection() {
    }

    public UserEtfSelection(User user, String symbol, String name, BigDecimal price, BigDecimal ter, boolean selected,
            boolean custom) {
        this.user = user;
        this.symbol = symbol;
        this.name = name;
        this.price = price;
        this.ter = ter;
        this.selected = selected;
        this.custom = custom;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
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

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getTer() {
        return ter;
    }

    public void setTer(BigDecimal ter) {
        this.ter = ter;
    }

    public boolean isSelected() {
        return selected;
    }

    public void setSelected(boolean selected) {
        this.selected = selected;
    }

    public boolean isCustom() {
        return custom;
    }

    public void setCustom(boolean custom) {
        this.custom = custom;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
