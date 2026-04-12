package com.etftracker.backend.dto;

import java.util.List;

public class AdminUserDto {

    private Long id;
    private String username;
    private String email;
    private boolean emailVerified;
    private List<String> roles;

    public AdminUserDto() {
    }

    public AdminUserDto(Long id, String username, String email, boolean emailVerified, List<String> roles) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.emailVerified = emailVerified;
        this.roles = roles;
    }

    public Long getId() {
        return id;
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

    public List<String> getRoles() {
        return roles;
    }
}
