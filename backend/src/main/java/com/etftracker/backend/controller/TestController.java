package com.etftracker.backend.controller;

import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class TestController {

    private final UserRepository userRepository;

    public TestController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/api/me")
    public Map<String, Object> me(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "emailVerified", user.isEmailVerified(),
                "roles", user.getRoles().stream().map(role -> role.getName()).sorted().toList());
    }
}
