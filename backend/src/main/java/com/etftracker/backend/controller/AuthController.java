package com.etftracker.backend.controller;

import com.etftracker.backend.dto.RegisterRequest;
import com.etftracker.backend.dto.AuthResponse;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.service.AuditLogService;
import com.etftracker.backend.service.EmailVerificationService;
import com.etftracker.backend.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.etftracker.backend.dto.LoginRequest;
import com.etftracker.backend.security.JwtUtil;
import org.springframework.http.ResponseCookie;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final EmailVerificationService emailVerificationService;
    private final AuditLogService auditLogService;

    @Value("${app.cookie.secure:false}")
    private boolean secureCookie;

    public AuthController(UserService userService, JwtUtil jwtUtil, EmailVerificationService emailVerificationService,
            AuditLogService auditLogService) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.emailVerificationService = emailVerificationService;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/register")
    public ResponseEntity<Object> register(@RequestBody RegisterRequest request) {
        try {
            AuthResponse response = userService.register(request);
            auditLogService.log(request.getUsername(), "AUTH", "Registrierung", "E-Mail: " + request.getEmail());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Registrierung konnte nicht abgeschlossen werden"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Object> login(@RequestBody LoginRequest request) {
        try {
            User user = userService.login(request.getUsername(), request.getPassword());
            String token = jwtUtil.generateToken(user.getUsername());

            ResponseCookie cookie = ResponseCookie.from("jwt", token)
                    .httpOnly(true)
                    .secure(secureCookie)
                    .sameSite("Lax")
                    .path("/")
                    .maxAge(24L * 60 * 60)
                    .build();

            auditLogService.log(user.getUsername(), "AUTH", "Login erfolgreich", null);
            return ResponseEntity.ok()
                    .header("Set-Cookie", cookie.toString())
                    .body(new AuthResponse(user.getUsername(), user.getEmail(), user.isEmailVerified(), null,
                            userService.isEmailVerificationRequired()));
        } catch (IllegalArgumentException ex) {
            auditLogService.log(request.getUsername(), "AUTH", "Login fehlgeschlagen", null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<Object> verifyEmail(@RequestParam("token") String token) {
        try {
            emailVerificationService.verifyEmail(token);
            return ResponseEntity.ok(Map.of("message", "E-Mail-Adresse erfolgreich bestaetigt"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        ResponseCookie expiredCookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();

        return ResponseEntity.ok()
                .header("Set-Cookie", expiredCookie.toString())
                .build();
    }

}
