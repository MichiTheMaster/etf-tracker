package com.etftracker.backend.controller;

import com.etftracker.backend.dto.AppSettingDto;
import com.etftracker.backend.dto.AppSettingHistoryDto;
import com.etftracker.backend.service.AppSettingHistoryService;
import com.etftracker.backend.service.AppSettingService;
import com.etftracker.backend.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {

    private final AppSettingService appSettingService;
    private final AppSettingHistoryService appSettingHistoryService;
    private final AuditLogService auditLogService;

    public AdminSettingsController(AppSettingService appSettingService, AppSettingHistoryService appSettingHistoryService,
            AuditLogService auditLogService) {
        this.appSettingService = appSettingService;
        this.appSettingHistoryService = appSettingHistoryService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<AppSettingDto> getAll() {
        return appSettingService.findAll();
    }

    @GetMapping("/history")
    public List<AppSettingHistoryDto> getHistory() {
        return appSettingHistoryService.getRecentHistory();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> upsert(@RequestBody AppSettingDto dto, Authentication auth) {
        try {
            String previousValue = appSettingService.findValue(dto.getKey());
            AppSettingDto saved = appSettingService.upsert(dto);
            String changeType = previousValue == null ? "CREATED" : "UPDATED";
            appSettingHistoryService.recordChange(
                    saved.getKey(),
                    previousValue,
                    saved.getValue(),
                    changeType,
                    auth.getName());
            auditLogService.log(auth.getName(), "ADMIN", "Einstellung geändert",
                    dto.getKey() + ": " + safe(previousValue) + " -> " + safe(saved.getValue()));
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{key}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String key, Authentication auth) {
        String previousValue = appSettingService.findValue(key);
        appSettingService.delete(key);
        appSettingHistoryService.recordChange(key, previousValue, null, "DELETED", auth.getName());
        auditLogService.log(auth.getName(), "ADMIN", "Einstellung gelöscht",
                key + ": " + safe(previousValue) + " -> (gelöscht)");
        return ResponseEntity.noContent().build();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}