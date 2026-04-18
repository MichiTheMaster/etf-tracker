package com.etftracker.backend.config.logging;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class RequestRedactionFilter extends OncePerRequestFilter {

    private static final Set<String> SENSITIVE_KEYS = new HashSet<>();
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${app.privacy.log-masking.enabled:true}")
    private boolean maskingEnabled;

    @Value("${spring.profiles.active:default}")
    private String env;

    static {
        SENSITIVE_KEYS.add("password");
        SENSITIVE_KEYS.add("token");
        SENSITIVE_KEYS.add("ssn");
        SENSITIVE_KEYS.add("creditCard");
        SENSITIVE_KEYS.add("cvv");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(request, 65536);
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);

        String correlationId = request.getHeader("X-Correlation-Id");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        long startMs = System.currentTimeMillis();

        MDC.put("correlation_id", correlationId);
        MDC.put("endpoint", request.getRequestURI());
        MDC.put("method", request.getMethod());
        MDC.put("env", env);

        try {
            filterChain.doFilter(wrappedRequest, wrappedResponse);

            MDC.put("status", String.valueOf(wrappedResponse.getStatus()));
            MDC.put("latency_ms", String.valueOf(System.currentTimeMillis() - startMs));

            if (maskingEnabled) {
                String contentType = request.getContentType() == null ? "" : request.getContentType();
                if (contentType.contains("application/json")) {
                    byte[] buf = wrappedRequest.getContentAsByteArray();
                    if (buf != null && buf.length > 0) {
                        String body = new String(buf, StandardCharsets.UTF_8);
                        try {
                            Map<String, Object> json = mapper.readValue(body, new TypeReference<>() {
                            });
                            redactMap(json);
                            String redacted = mapper.writeValueAsString(json);
                            request.setAttribute("sanitizedRequestBody", redacted);
                        } catch (Exception ignored) {
                            // not parseable JSON — skip redaction
                        }
                    }
                }
            }

            wrappedResponse.copyBodyToResponse();

        } finally {
            MDC.remove("correlation_id");
            MDC.remove("endpoint");
            MDC.remove("method");
            MDC.remove("env");
            MDC.remove("status");
            MDC.remove("latency_ms");
        }
    }

    @SuppressWarnings("unchecked")
    private void redactMap(Map<String, Object> json) {
        for (Map.Entry<String, Object> e : json.entrySet()) {
            String key = e.getKey();
            Object val = e.getValue();
            if (val == null)
                continue;
            if (SENSITIVE_KEYS.contains(key)) {
                json.put(key, "[REDACTED]");
            } else if (val instanceof Map) {
                redactMap((Map<String, Object>) val);
            }
        }
    }
}
