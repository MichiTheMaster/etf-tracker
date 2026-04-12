package com.etftracker.backend.dto;

import java.time.Instant;

public class AppSettingHistoryDto {
    private Long id;
    private String settingKey;
    private String oldValue;
    private String newValue;
    private String changeType;
    private String changedBy;
    private Instant changedAt;

    public AppSettingHistoryDto(Long id, String settingKey, String oldValue, String newValue, String changeType,
            String changedBy, Instant changedAt) {
        this.id = id;
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
