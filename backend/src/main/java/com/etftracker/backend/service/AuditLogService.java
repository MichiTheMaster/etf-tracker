package com.etftracker.backend.service;

import com.etftracker.backend.entity.AuditLog;
import com.etftracker.backend.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuditLogService {

    private static final String TIMESTAMP_FIELD = "timestamp";

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String username, String category, String action, String details) {
        auditLogRepository.save(new AuditLog(username, category, action, details));
    }

    public Page<AuditLog> getPage(int page, int size) {
        return auditLogRepository.findAllByOrderByTimestampDesc(PageRequest.of(page, size));
    }

    public Page<AuditLog> getPageFiltered(int page, int size, String category, String username, Instant from,
            Instant to) {
        Specification<AuditLog> spec = (root, query, cb) -> cb.conjunction();

        if (category != null && !category.isBlank()) {
            String normalizedCategory = category.trim().toUpperCase();
            spec = spec.and((root, query, cb) -> cb.equal(cb.upper(root.get("category")), normalizedCategory));
        }

        if (username != null && !username.isBlank()) {
            String normalizedUsername = "%" + username.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("username")), normalizedUsername));
        }

        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get(TIMESTAMP_FIELD), from));
        }

        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get(TIMESTAMP_FIELD), to));
        }

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, TIMESTAMP_FIELD));
        return auditLogRepository.findAll(spec, pageable);
    }
}
