package com.etftracker.backend.controller;

import com.etftracker.backend.dto.RegisterRequest;
import com.etftracker.backend.dto.AuthResponse;
import com.etftracker.backend.dto.LoginAttemptResult;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.service.AuditLogService;
import com.etftracker.backend.service.EmailVerificationService;
import com.etftracker.backend.service.PasswordResetService;
import com.etftracker.backend.service.UserSessionService;
import com.etftracker.backend.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    private final PasswordResetService passwordResetService;
    private final AuditLogService auditLogService;
    private final UserSessionService userSessionService;

    @Value("${app.cookie.secure:false}")
    private boolean secureCookie;

    public AuthController(UserService userService, JwtUtil jwtUtil, EmailVerificationService emailVerificationService,
            PasswordResetService passwordResetService, AuditLogService auditLogService,
            UserSessionService userSessionService) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
        this.auditLogService = auditLogService;
        this.userSessionService = userSessionService;
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
    public ResponseEntity<Object> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        try {
            String ipAddress = extractIpAddress(httpRequest);
            LoginAttemptResult loginResult = userService.login(
                    request.getUsername(),
                    request.getPassword(),
                    ipAddress,
                    httpRequest.getHeader("User-Agent"));
            User user = loginResult.getUser();
            String token = jwtUtil.generateToken(user.getUsername());
            String sessionId = userSessionService.createSession(user,
                    httpRequest.getHeader("User-Agent"),
                    ipAddress);

            ResponseCookie jwtCookie = ResponseCookie.from("jwt", token)
                    .httpOnly(true)
                    .secure(secureCookie)
                    .sameSite("Lax")
                    .path("/")
                    .maxAge(24L * 60 * 60)
                    .build();

            ResponseCookie sidCookie = ResponseCookie.from("sid", sessionId)
                    .httpOnly(true)
                    .secure(secureCookie)
                    .sameSite("Lax")
                    .path("/")
                    .maxAge(24L * 60 * 60)
                    .build();

            auditLogService.log(user.getUsername(), "AUTH", "Login erfolgreich", loginResult.getLoginDetails());
            if (loginResult.isUnusualActivity()) {
                auditLogService.log(user.getUsername(), "AUTH", "Ungewöhnliche Aktivität",
                        loginResult.getLoginDetails());
            }
            return ResponseEntity.ok()
                    .header("Set-Cookie", jwtCookie.toString(), sidCookie.toString())
                    .body(new AuthResponse(user.getUsername(), user.getEmail(), user.isEmailVerified(), null,
                            userService.isEmailVerificationRequired()));
        } catch (IllegalArgumentException ex) {
            auditLogService.log(request.getUsername(), "AUTH", "Login fehlgeschlagen",
                    "IP: " + extractIpAddress(httpRequest));
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("gesperrt")) {
                auditLogService.log(request.getUsername(), "AUTH", "Account gesperrt",
                        "IP: " + extractIpAddress(httpRequest));
            }
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
    public ResponseEntity<?> logout(@CookieValue(value = "sid", required = false) String sessionId,
            Authentication auth) {
        if (auth != null && sessionId != null && !sessionId.isBlank()) {
            userSessionService.revokeCurrent(auth.getName(), sessionId);
        }

        ResponseCookie expiredJwtCookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();

        ResponseCookie expiredSidCookie = ResponseCookie.from("sid", "")
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();

        return ResponseEntity.ok()
                .header("Set-Cookie", expiredJwtCookie.toString(), expiredSidCookie.toString())
                .build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Object> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "E-Mail-Adresse ist erforderlich"));
            }
            passwordResetService.createAndSendResetToken(email.trim());
            return ResponseEntity.ok(Map.of("message",
                    "Falls ein Account mit dieser E-Mail-Adresse existiert, wurde eine Reset-E-Mail versendet"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Passwort-Reset konnte nicht initiiert werden"));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Object> resetPassword(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("token");
            String newPassword = request.get("newPassword");
            if (token == null || token.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Token ist erforderlich"));
            }
            if (newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Passwort muss mindestens 6 Zeichen lang sein"));
            }
            passwordResetService.resetPassword(token.trim(), newPassword);
            return ResponseEntity.ok(Map.of("message", "Passwort erfolgreich zurückgesetzt"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Passwort-Reset fehlgeschlagen"));
        }
    }

    private String extractIpAddress(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

}
