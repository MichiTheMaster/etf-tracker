package com.etftracker.backend.config.logging;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.MDC;
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
        MDC.put("correlation_id", correlationId);

        try {
            filterChain.doFilter(wrappedRequest, wrappedResponse);

            // After processing, attempt to read request body (if JSON) and produce a
            // redacted copy
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
                        // expose as request attribute for any structured logging usage
                        request.setAttribute("sanitizedRequestBody", redacted);
                    } catch (Exception ignored) {
                        // not a parseable JSON or unexpected structure; skip redaction
                    }
                }
            }

            // copy response back to output
            wrappedResponse.copyBodyToResponse();

        } finally {
            MDC.remove("correlation_id");
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
            // arrays and other complex structures are left untouched in this simple
            // implementation
        }
    }
}
