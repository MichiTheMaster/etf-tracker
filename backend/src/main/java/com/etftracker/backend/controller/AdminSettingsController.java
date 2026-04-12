package com.etftracker.backend.controller;

import com.etftracker.backend.dto.AppSettingDto;
import com.etftracker.backend.service.AppSettingService;
import org.springframework.http.ResponseEntity;
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

    public AdminSettingsController(AppSettingService appSettingService) {
        this.appSettingService = appSettingService;
    }

    @GetMapping
    public List<AppSettingDto> getAll() {
        return appSettingService.findAll();
    }

    @PostMapping
    public ResponseEntity<?> upsert(@RequestBody AppSettingDto dto) {
        try {
            return ResponseEntity.ok(appSettingService.upsert(dto));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{key}")
    public ResponseEntity<Void> delete(@PathVariable String key) {
        appSettingService.delete(key);
        return ResponseEntity.noContent().build();
    }
}