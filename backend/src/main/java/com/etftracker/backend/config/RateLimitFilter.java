package com.etftracker.backend.config;

import com.etftracker.backend.config.logging.IpUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int AUTH_LIMIT = 10;
    private static final int MARKET_LIMIT = 60;
    private static final long WINDOW_MS = 60_000L;

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        int limit = limitFor(request.getMethod(), request.getRequestURI());
        if (limit <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = limit + ":" + clientIp(request) + ":" + bucket(request.getRequestURI());
        if (isLimited(key, limit)) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"message\":\"Zu viele Anfragen. Bitte kurz warten.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isLimited(String key, int limit) {
        long now = Instant.now().toEpochMilli();
        Deque<Long> timestamps = hits.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= limit) {
                return true;
            }
            timestamps.addLast(now);
            return false;
        }
    }

    private static int limitFor(String method, String uri) {
        if (uri == null) {
            return 0;
        }
        if (uri.startsWith("/auth/login") || uri.startsWith("/auth/register")
                || uri.startsWith("/auth/forgot-password") || uri.startsWith("/auth/reset-password")) {
            return AUTH_LIMIT;
        }
        if ("GET".equalsIgnoreCase(method) && uri.startsWith("/api/market/")) {
            return MARKET_LIMIT;
        }
        return 0;
    }

    private static String bucket(String uri) {
        if (uri.startsWith("/api/market/")) {
            return "market";
        }
        return uri;
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return IpUtil.truncate(forwarded.split(",")[0].trim());
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return IpUtil.truncate(realIp.trim());
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}
