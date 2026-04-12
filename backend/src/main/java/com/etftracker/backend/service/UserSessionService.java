package com.etftracker.backend.service;

import com.etftracker.backend.dto.UserSessionDto;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.entity.UserSession;
import com.etftracker.backend.repository.UserSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class UserSessionService {

    private static final long SESSION_HOURS = 24;

    private final UserSessionRepository userSessionRepository;

    public UserSessionService(UserSessionRepository userSessionRepository) {
        this.userSessionRepository = userSessionRepository;
    }

    @Transactional
    public String createSession(User user, String userAgent, String ipAddress) {
        Instant now = Instant.now();
        String sessionId = UUID.randomUUID().toString();
        UserSession session = new UserSession(
                sessionId,
                user,
                now,
                now,
                now.plus(SESSION_HOURS, ChronoUnit.HOURS),
                truncate(userAgent, 255),
                truncate(ipAddress, 64));

        userSessionRepository.save(session);
        return sessionId;
    }

    @Transactional
    public boolean isSessionValid(String sessionId, String username) {
        if (sessionId == null || sessionId.isBlank() || username == null || username.isBlank()) {
            return false;
        }

        return userSessionRepository.findByIdAndUserUsername(sessionId, username)
                .map(session -> isActive(session, Instant.now()))
                .orElse(false);
    }

    @Transactional
    public void touchSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }

        userSessionRepository.findById(sessionId).ifPresent(session -> {
            if (isActive(session, Instant.now())) {
                session.setLastSeenAt(Instant.now());
                userSessionRepository.save(session);
            }
        });
    }

    @Transactional
    public void revokeCurrent(String username, String sessionId) {
        revokeForUser(username, sessionId);
    }

    @Transactional
    public void revokeSession(String username, String sessionId) {
        revokeForUser(username, sessionId);
    }

    @Transactional
    public void revokeAllOther(String username, String currentSessionId) {
        Instant now = Instant.now();
        List<UserSession> sessions = userSessionRepository.findByUserUsernameOrderByLastSeenAtDesc(username);
        for (UserSession session : sessions) {
            if (!isActive(session, now)) {
                continue;
            }
            if (session.getId().equals(currentSessionId)) {
                continue;
            }
            session.setRevokedAt(now);
        }
        userSessionRepository.saveAll(sessions);
    }

    @Transactional(readOnly = true)
    public List<UserSessionDto> listActiveSessions(String username, String currentSessionId) {
        Instant now = Instant.now();
        return userSessionRepository.findByUserUsernameOrderByLastSeenAtDesc(username).stream()
                .filter(session -> isActive(session, now))
                .map(session -> new UserSessionDto(
                        session.getId(),
                        session.getId().equals(currentSessionId),
                        session.getCreatedAt(),
                        session.getLastSeenAt(),
                        session.getExpiresAt(),
                        session.getUserAgent(),
                        session.getIpAddress()))
                .toList();
    }

    private void revokeForUser(String username, String sessionId) {
        if (username == null || username.isBlank() || sessionId == null || sessionId.isBlank()) {
            return;
        }

        userSessionRepository.findByIdAndUserUsername(sessionId, username).ifPresent(session -> {
            if (session.getRevokedAt() == null) {
                session.setRevokedAt(Instant.now());
                userSessionRepository.save(session);
            }
        });
    }

    private boolean isActive(UserSession session, Instant now) {
        return session.getRevokedAt() == null && session.getExpiresAt().isAfter(now);
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
