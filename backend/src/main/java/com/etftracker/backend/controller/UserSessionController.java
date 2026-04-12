package com.etftracker.backend.controller;

import com.etftracker.backend.dto.UserSessionDto;
import com.etftracker.backend.service.AuditLogService;
import com.etftracker.backend.service.UserSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/me/sessions")
public class UserSessionController {

    private final UserSessionService userSessionService;
    private final AuditLogService auditLogService;

    public UserSessionController(UserSessionService userSessionService, AuditLogService auditLogService) {
        this.userSessionService = userSessionService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<UserSessionDto> getSessions(Authentication auth,
            @CookieValue(value = "sid", required = false) String currentSessionId) {
        return userSessionService.listActiveSessions(auth.getName(), currentSessionId);
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Map<String, String>> revokeSession(@PathVariable String sessionId, Authentication auth,
            @CookieValue(value = "sid", required = false) String currentSessionId) {
        if (sessionId != null && sessionId.equals(currentSessionId)) {
            userSessionService.revokeCurrent(auth.getName(), sessionId);
            auditLogService.log(auth.getName(), "AUTH", "Aktuelle Session beendet", null);
            return ResponseEntity.ok(Map.of("message", "Aktuelle Session beendet"));
        }

        userSessionService.revokeSession(auth.getName(), sessionId);
        auditLogService.log(auth.getName(), "AUTH", "Session beendet", "Session-ID: " + sessionId);
        return ResponseEntity.ok(Map.of("message", "Session beendet"));
    }

    @DeleteMapping("/others")
    public ResponseEntity<Map<String, String>> revokeOtherSessions(Authentication auth,
            @CookieValue(value = "sid", required = false) String currentSessionId) {
        userSessionService.revokeAllOther(auth.getName(), currentSessionId);
        auditLogService.log(auth.getName(), "AUTH", "Andere Sessions beendet", null);
        return ResponseEntity.ok(Map.of("message", "Alle anderen Sessions wurden beendet"));
    }
}
