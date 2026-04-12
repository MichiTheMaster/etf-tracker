package com.etftracker.backend.controller;

import com.etftracker.backend.dto.AuditLogDto;
import com.etftracker.backend.entity.AuditLog;
import com.etftracker.backend.service.AuditLogService;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-log")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public Map<String, Object> getAuditLog(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        Page<AuditLog> result = auditLogService.getPageFiltered(
                page,
                Math.min(size, 200),
                category,
                username,
                from,
                to);
        return Map.of(
                "content", result.getContent().stream().map(this::toDto).toList(),
                "totalPages", result.getTotalPages(),
                "totalElements", result.getTotalElements(),
                "page", result.getNumber());
    }

    private AuditLogDto toDto(AuditLog log) {
        return new AuditLogDto(log.getId(), log.getUsername(), log.getCategory(),
                log.getAction(), log.getDetails(), log.getTimestamp());
    }
}
