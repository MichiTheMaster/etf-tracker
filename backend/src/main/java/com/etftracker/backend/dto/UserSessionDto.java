package com.etftracker.backend.dto;

import java.time.Instant;

public class UserSessionDto {
    private String id;
    private boolean current;
    private Instant createdAt;
    private Instant lastSeenAt;
    private Instant expiresAt;
    private String userAgent;
    private String ipAddress;

    public UserSessionDto(String id, boolean current, Instant createdAt, Instant lastSeenAt, Instant expiresAt,
            String userAgent, String ipAddress) {
        this.id = id;
        this.current = current;
        this.createdAt = createdAt;
        this.lastSeenAt = lastSeenAt;
        this.expiresAt = expiresAt;
        this.userAgent = userAgent;
        this.ipAddress = ipAddress;
    }

    public String getId() {
        return id;
    }

    public boolean isCurrent() {
        return current;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getIpAddress() {
        return ipAddress;
    }
}
