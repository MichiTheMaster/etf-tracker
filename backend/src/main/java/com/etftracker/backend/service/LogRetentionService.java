package com.etftracker.backend.service;

import com.etftracker.backend.repository.AuditLogRepository;
import com.etftracker.backend.repository.UserSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Deletes old audit_log and user_sessions rows according to configured
 * retention periods.
 * Runs nightly via cron. Deletion actions are themselves emitted as INFO log
 * lines
 * (no personal data in the log message, only counts).
 */
@Service
public class LogRetentionService {

    private static final Logger log = LoggerFactory.getLogger(LogRetentionService.class);

    @Value("${app.logging.audit.retention-days:365}")
    private int auditRetentionDays;

    @Value("${app.logging.session.retention-days:90}")
    private int sessionRetentionDays;

    private final AuditLogRepository auditLogRepository;
    private final UserSessionRepository userSessionRepository;

    public LogRetentionService(AuditLogRepository auditLogRepository,
            UserSessionRepository userSessionRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userSessionRepository = userSessionRepository;
    }

    /**
     * Prune audit_log rows older than app.logging.audit.retention-days (default
     * 365).
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void pruneAuditLogs() {
        Instant cutoff = Instant.now().minus(auditRetentionDays, ChronoUnit.DAYS);
        int deleted = auditLogRepository.deleteByTimestampBefore(cutoff);
        if (deleted > 0) {
            log.info("Retention: deleted {} audit_log rows older than {} days", deleted, auditRetentionDays);
        }
    }

    /**
     * Prune expired user_sessions rows (expiresAt older than
     * app.logging.session.retention-days, default 90).
     */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void pruneExpiredSessions() {
        Instant cutoff = Instant.now().minus(sessionRetentionDays, ChronoUnit.DAYS);
        int deleted = userSessionRepository.deleteByExpiresAtBefore(cutoff);
        if (deleted > 0) {
            log.info("Retention: deleted {} user_sessions rows with expiresAt older than {} days",
                    deleted, sessionRetentionDays);
        }
    }
}
