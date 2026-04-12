package com.etftracker.backend.dto;

import java.time.Instant;

public class AuditLogDto {
    public Long id;
    public String username;
    public String category;
    public String action;
    public String details;
    public Instant timestamp;

    public AuditLogDto(Long id, String username, String category, String action, String details, Instant timestamp) {
        this.id = id;
        this.username = username;
        this.category = category;
        this.action = action;
        this.details = details;
        this.timestamp = timestamp;
    }
}
