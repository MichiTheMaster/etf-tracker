package com.etftracker.backend.controller;

import com.etftracker.backend.entity.Role;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.RoleRepository;
import com.etftracker.backend.repository.UserRepository;
import com.etftracker.backend.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditLogService auditLogService;

    public AdminUserController(UserRepository userRepository, RoleRepository roleRepository,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<Map<String, Object>> getUsers() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .sorted(Comparator.comparing(entry -> String.valueOf(entry.get("username")), String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @PutMapping("/{id}/roles/admin")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> grantAdmin(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findById(id)
                .orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        Role adminRole = getRoleByName("ADMIN");
        user.getRoles().removeIf(role -> "READONLY_ADMIN".equalsIgnoreCase(role.getName()));
        user.getRoles().add(adminRole);
        User saved = userRepository.save(user);
        auditLogService.log(auth.getName(), "ADMIN", "Admin-Rolle vergeben", "Benutzer: " + user.getUsername());
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{id}/roles/admin")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> revokeAdmin(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findById(id)
                .orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        Role userRole = getRoleByName("USER");

        user.getRoles().removeIf(role -> "ADMIN".equalsIgnoreCase(role.getName()));
        user.getRoles().add(userRole);

        User saved = userRepository.save(user);
        auditLogService.log(auth.getName(), "ADMIN", "Admin-Rolle entzogen", "Benutzer: " + user.getUsername());
        return ResponseEntity.ok(toDto(saved));
    }

    @PutMapping("/{id}/roles/readonly-admin")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> grantReadonlyAdmin(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findById(id)
                .orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        Role readonlyRole = getRoleByName("READONLY_ADMIN");
        user.getRoles().removeIf(role -> "ADMIN".equalsIgnoreCase(role.getName()));
        user.getRoles().add(readonlyRole);
        User saved = userRepository.save(user);
        auditLogService.log(auth.getName(), "ADMIN", "READONLY_ADMIN-Rolle vergeben",
                "Benutzer: " + user.getUsername());
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{id}/roles/readonly-admin")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> revokeReadonlyAdmin(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findById(id)
                .orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        Role userRole = getRoleByName("USER");
        user.getRoles().removeIf(role -> "READONLY_ADMIN".equalsIgnoreCase(role.getName()));
        user.getRoles().add(userRole);
        User saved = userRepository.save(user);
        auditLogService.log(auth.getName(), "ADMIN", "READONLY_ADMIN-Rolle entzogen",
                "Benutzer: " + user.getUsername());
        return ResponseEntity.ok(toDto(saved));
    }

    private Role getRoleByName(String roleName) {
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Role " + roleName + " not found"));
    }

    private Map<String, Object> toDto(User user) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .filter(name -> name != null && !name.isBlank())
                .map(name -> name.toUpperCase(Locale.ROOT))
                .sorted()
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("username", user.getUsername());
        result.put("email", user.getEmail());
        result.put("emailVerified", user.isEmailVerified());
        result.put("roles", roles);
        result.put("failedLoginAttempts", user.getFailedLoginAttempts());
        result.put("lockedUntil", user.getLockedUntil());
        result.put("lastLoginAt", user.getLastLoginAt());
        result.put("lastLoginIp", user.getLastLoginIp());
        return result;
    }
}
