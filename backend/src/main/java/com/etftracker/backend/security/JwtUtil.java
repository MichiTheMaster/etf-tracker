package com.etftracker.backend.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Locale;
import java.util.Set;

@Component
public class JwtUtil {

    private static final Set<String> INSECURE_SECRETS = Set.of(
            "change-me",
            "change-me-very-long-random-secret",
            "change-me-to-a-long-random-value-at-least-32-chars",
            "dev-secret-key-change-me-please-1234567890");

    private final SecretKey SECRET;
    private final long EXPIRATION = 1000 * 60 * 60 * 24;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${app.security.reject-insecure-jwt:false}") boolean rejectInsecureJwt) {
        byte[] secretBytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET muss mindestens 32 Zeichen haben.");
        }
        String normalized = secret.trim().toLowerCase(Locale.ROOT);
        boolean placeholder = INSECURE_SECRETS.contains(normalized) || normalized.startsWith("change-me");
        if (rejectInsecureJwt && placeholder) {
            throw new IllegalStateException("JWT_SECRET ist ein Platzhalter. Bitte einen zufälligen Wert setzen.");
        }
        this.SECRET = Keys.hmacShaKeyFor(secretBytes);
    }

    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION))
                .signWith(SECRET, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(SECRET)
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }

    public boolean isTokenValid(String token, org.springframework.security.core.userdetails.UserDetails userDetails) {
        String username = extractUsername(token);
        return username != null && userDetails != null && username.equals(userDetails.getUsername());
    }
}
