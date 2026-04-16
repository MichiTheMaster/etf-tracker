package com.etftracker.backend.controller;

import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.UserRepository;
import com.etftracker.backend.service.AuditLogService;
import com.etftracker.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class TestController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final AuditLogService auditLogService;

    public TestController(UserRepository userRepository, UserService userService, AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/api/me")
    public Map<String, Object> me(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "emailVerified", user.isEmailVerified(),
                "roles", user.getRoles().stream().map(role -> role.getName()).sorted().toList());
    }

    @PostMapping("/api/user/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        try {
            userService.changePassword(auth.getName(), currentPassword, newPassword);
            auditLogService.log(auth.getName(), "AUTH", "Passwort geändert", null);
            return ResponseEntity.ok(Map.of("message", "Passwort erfolgreich geändert"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/api/user/change-email")
    public ResponseEntity<Map<String, String>> changeEmail(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String currentPassword = body.get("currentPassword");
        String newEmail = body.get("newEmail");

        try {
            userService.changeEmail(auth.getName(), currentPassword, newEmail);
            auditLogService.log(auth.getName(), "AUTH", "E-Mail geändert", "Neue E-Mail: " + newEmail);
            return ResponseEntity.ok(Map.of("message", "E-Mail erfolgreich geändert"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
