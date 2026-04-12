package com.etftracker.backend.dto;

import java.time.Instant;

public class LockedAccountDto {
    private Long userId;
    private String username;
    private String email;
    private int failedLoginAttempts;
    private Instant lockedUntil;

    public LockedAccountDto(Long userId, String username, String email, int failedLoginAttempts, Instant lockedUntil) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.failedLoginAttempts = failedLoginAttempts;
        this.lockedUntil = lockedUntil;
    }

    public Long getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public int getFailedLoginAttempts() {
        return failedLoginAttempts;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }
}
