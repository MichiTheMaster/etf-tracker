package com.etftracker.backend.controller;

import com.etftracker.backend.dto.RegisterRequest;
import com.etftracker.backend.dto.AuthResponse;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.service.AuditLogService;
import com.etftracker.backend.service.EmailVerificationService;
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
    private final AuditLogService auditLogService;
    private final UserSessionService userSessionService;

    @Value("${app.cookie.secure:false}")
    private boolean secureCookie;

    public AuthController(UserService userService, JwtUtil jwtUtil, EmailVerificationService emailVerificationService,
            AuditLogService auditLogService, UserSessionService userSessionService) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.emailVerificationService = emailVerificationService;
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
            User user = userService.login(request.getUsername(), request.getPassword());
            String token = jwtUtil.generateToken(user.getUsername());
            String sessionId = userSessionService.createSession(user,
                httpRequest.getHeader("User-Agent"),
                extractIpAddress(httpRequest));

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

            auditLogService.log(user.getUsername(), "AUTH", "Login erfolgreich", null);
            return ResponseEntity.ok()
                    .header("Set-Cookie", jwtCookie.toString(), sidCookie.toString())
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

    private String extractIpAddress(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

}
