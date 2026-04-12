package com.etftracker.backend.controller;

import com.etftracker.backend.dto.AppSettingDto;
import com.etftracker.backend.service.AppSettingService;
import com.etftracker.backend.service.AuditLogService;
import org.springframework.http.ResponseEntity;
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
    private final AuditLogService auditLogService;

    public AdminSettingsController(AppSettingService appSettingService, AuditLogService auditLogService) {
        this.appSettingService = appSettingService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<AppSettingDto> getAll() {
        return appSettingService.findAll();
    }

    @PostMapping
    public ResponseEntity<?> upsert(@RequestBody AppSettingDto dto, Authentication auth) {
        try {
            AppSettingDto saved = appSettingService.upsert(dto);
            auditLogService.log(auth.getName(), "ADMIN", "Einstellung geändert",
                    dto.getKey() + " = " + dto.getValue());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{key}")
    public ResponseEntity<Void> delete(@PathVariable String key, Authentication auth) {
        appSettingService.delete(key);
        auditLogService.log(auth.getName(), "ADMIN", "Einstellung gelöscht", "Key: " + key);
        return ResponseEntity.noContent().build();
    }
}