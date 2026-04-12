package com.etftracker.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "app_setting_history")
public class AppSettingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String settingKey;

    @Column(length = 4000)
    private String oldValue;

    @Column(length = 4000)
    private String newValue;

    @Column(nullable = false, length = 40)
    private String changeType;

    @Column(nullable = false, length = 120)
    private String changedBy;

    @Column(nullable = false)
    private Instant changedAt;

    public AppSettingHistory() {
    }

    public AppSettingHistory(String settingKey, String oldValue, String newValue, String changeType, String changedBy,
            Instant changedAt) {
        this.settingKey = settingKey;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.changeType = changeType;
        this.changedBy = changedBy;
        this.changedAt = changedAt;
    }

    public Long getId() {
        return id;
    }

    public String getSettingKey() {
        return settingKey;
    }

    public String getOldValue() {
        return oldValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public String getChangeType() {
        return changeType;
    }

    public String getChangedBy() {
        return changedBy;
    }

    public Instant getChangedAt() {
        return changedAt;
    }
}
