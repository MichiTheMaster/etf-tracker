package com.etftracker.backend.controller;

import com.etftracker.backend.dto.AdminUserDto;
import com.etftracker.backend.entity.Role;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.RoleRepository;
import com.etftracker.backend.repository.UserRepository;
import com.etftracker.backend.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

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
    public List<AdminUserDto> getUsers() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .sorted(Comparator.comparing(AdminUserDto::getUsername, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @PutMapping("/{id}/roles/admin")
    public ResponseEntity<?> grantAdmin(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findById(id)
                .orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("Role ADMIN not found"));

        user.getRoles().add(adminRole);
        User saved = userRepository.save(user);
        auditLogService.log(auth.getName(), "ADMIN", "Admin-Rolle vergeben", "Benutzer: " + user.getUsername());
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{id}/roles/admin")
    public ResponseEntity<?> revokeAdmin(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findById(id)
                .orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        Role userRole = roleRepository.findByName("USER")
                .orElseThrow(() -> new IllegalStateException("Role USER not found"));

        user.getRoles().removeIf(role -> "ADMIN".equalsIgnoreCase(role.getName()));
        user.getRoles().add(userRole);

        User saved = userRepository.save(user);
        auditLogService.log(auth.getName(), "ADMIN", "Admin-Rolle entzogen", "Benutzer: " + user.getUsername());
        return ResponseEntity.ok(toDto(saved));
    }

    private AdminUserDto toDto(User user) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .filter(name -> name != null && !name.isBlank())
                .map(name -> name.toUpperCase(Locale.ROOT))
                .sorted()
                .toList();

        return new AdminUserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.isEmailVerified(),
                roles);
    }
}
