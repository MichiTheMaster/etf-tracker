package com.etftracker.backend.dto;

import java.time.Instant;

public class SecurityIncidentDto {
    private Long id;
    private String username;
    private String action;
    private String details;
    private Instant timestamp;

    public SecurityIncidentDto(Long id, String username, String action, String details, Instant timestamp) {
        this.id = id;
        this.username = username;
        this.action = action;
        this.details = details;
        this.timestamp = timestamp;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getAction() {
        return action;
    }

    public String getDetails() {
        return details;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
