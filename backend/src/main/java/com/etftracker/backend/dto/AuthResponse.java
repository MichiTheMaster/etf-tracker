package com.etftracker.backend.dto;

public class AuthResponse {
    private final String username;
    private final String email;
    private final boolean emailVerified;
    private final String message;
    private final boolean verificationRequired;

    public AuthResponse(String username, String email, boolean emailVerified, String message,
            boolean verificationRequired) {
        this.username = username;
        this.email = email;
        this.emailVerified = emailVerified;
        this.message = message;
        this.verificationRequired = verificationRequired;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public String getMessage() {
        return message;
    }

    public boolean isVerificationRequired() {
        return verificationRequired;
    }
}