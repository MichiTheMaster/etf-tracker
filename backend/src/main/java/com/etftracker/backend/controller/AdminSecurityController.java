package com.etftracker.backend.controller;

import com.etftracker.backend.dto.LockedAccountDto;
import com.etftracker.backend.dto.SecurityIncidentDto;
import com.etftracker.backend.dto.SecurityOverviewDto;
import com.etftracker.backend.entity.AuditLog;
import com.etftracker.backend.entity.Role;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.RoleRepository;
import com.etftracker.backend.repository.UserRepository;
import com.etftracker.backend.service.AuditLogService;
import com.etftracker.backend.service.UserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/security")
public class AdminSecurityController {

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
        private final RoleRepository roleRepository;
    private final UserService userService;

    public AdminSecurityController(AuditLogService auditLogService, UserRepository userRepository,
                        RoleRepository roleRepository, UserService userService) {
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
                this.roleRepository = roleRepository;
        this.userService = userService;
    }

    @GetMapping("/overview")
    public SecurityOverviewDto getOverview() {
        Instant now = Instant.now();
        List<AuditLog> authEntries = auditLogService.getListFiltered(5000, "AUTH", null, now.minus(7, ChronoUnit.DAYS), now);

        long failed24h = authEntries.stream()
                .filter(entry -> "Login fehlgeschlagen".equalsIgnoreCase(entry.getAction()))
                .filter(entry -> entry.getTimestamp() != null && entry.getTimestamp().isAfter(now.minus(24, ChronoUnit.HOURS)))
                .count();

        long failed7d = authEntries.stream()
                .filter(entry -> "Login fehlgeschlagen".equalsIgnoreCase(entry.getAction()))
                .count();

        Map<String, Long> failedByUser = authEntries.stream()
                .filter(entry -> "Login fehlgeschlagen".equalsIgnoreCase(entry.getAction()))
                .filter(entry -> entry.getUsername() != null && !entry.getUsername().isBlank())
                .collect(LinkedHashMap::new,
                        (map, entry) -> map.merge(entry.getUsername(), 1L, Long::sum),
                        LinkedHashMap::putAll);

        List<LockedAccountDto> lockedAccounts = userRepository.findByLockedUntilAfterOrderByLockedUntilAsc(now).stream()
                .map(this::toLockedDto)
                .toList();

        List<SecurityIncidentDto> unusualActivities = authEntries.stream()
                .filter(entry -> isSecurityIncident(entry.getAction()))
                .sorted((left, right) -> right.getTimestamp().compareTo(left.getTimestamp()))
                .limit(50)
                .map(entry -> new SecurityIncidentDto(
                        entry.getId(),
                        entry.getUsername(),
                        entry.getAction(),
                        entry.getDetails(),
                        entry.getTimestamp()))
                .toList();

        return new SecurityOverviewDto(failed24h, failed7d, lockedAccounts, unusualActivities, failedByUser);
    }

    @DeleteMapping("/locks/{userId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public Map<String, String> unlockAccount(@PathVariable Long userId, Authentication auth) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Benutzer nicht gefunden"));
        userService.unlockAccount(userId);
        auditLogService.log(auth.getName(), "ADMIN", "Konto entsperrt", "Benutzer: " + user.getUsername());
        return Map.of("message", "Konto entsperrt");
    }

    @PostMapping("/locks/{userId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public Map<String, String> lockAccount(@PathVariable Long userId,
            @RequestParam(required = false) Integer minutes,
            Authentication auth) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Benutzer nicht gefunden"));
        userService.lockAccount(userId, minutes);
        auditLogService.log(auth.getName(), "ADMIN", "Konto gesperrt",
                "Benutzer: " + user.getUsername() + (minutes == null ? "" : " | Minuten: " + minutes));
        return Map.of("message", "Konto gesperrt");
    }

        @PostMapping("/self/restore-admin")
        @PreAuthorize("hasAnyAuthority('ADMIN','READONLY_ADMIN')")
        public Map<String, String> restoreOwnAdmin(Authentication auth) {
                User currentUser = userRepository.findByUsername(auth.getName())
                                .orElseThrow(() -> new IllegalArgumentException("Benutzer nicht gefunden"));

                Role adminRole = roleRepository.findByName("ADMIN")
                                .orElseThrow(() -> new IllegalStateException("Role ADMIN not found"));
                currentUser.getRoles().add(adminRole);
                userRepository.save(currentUser);

                auditLogService.log(auth.getName(), "ADMIN", "Admin-Rechte wiederhergestellt", "Self-Service Recovery");
                return Map.of("message", "Admin-Rechte wurden wiederhergestellt");
        }

    private LockedAccountDto toLockedDto(User user) {
        return new LockedAccountDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFailedLoginAttempts(),
                user.getLockedUntil());
    }

    private boolean isSecurityIncident(String action) {
        if (action == null) {
            return false;
        }
        return "Login fehlgeschlagen".equalsIgnoreCase(action)
                || "Account gesperrt".equalsIgnoreCase(action)
                || "Ungewöhnliche Aktivität".equalsIgnoreCase(action);
    }
}
