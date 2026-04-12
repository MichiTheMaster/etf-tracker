package com.etftracker.backend.service;

import com.etftracker.backend.entity.AuditLog;
import com.etftracker.backend.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

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
}
