package com.etftracker.backend.service;

import com.etftracker.backend.dto.RegisterRequest;
import com.etftracker.backend.dto.AuthResponse;
import com.etftracker.backend.entity.Role;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.RoleRepository;
import com.etftracker.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmailVerificationService emailVerificationService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${app.email-verification.required:false}")
    private boolean emailVerificationRequired;

    public UserService(UserRepository userRepository, RoleRepository roleRepository,
            EmailVerificationService emailVerificationService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.emailVerificationService = emailVerificationService;
    }

    public AuthResponse register(RegisterRequest request) {
        String username = request.getUsername() == null ? "" : request.getUsername().trim();
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String password = request.getPassword() == null ? "" : request.getPassword();

        if (username.isBlank() || email.isBlank() || password.isBlank()) {
            throw new IllegalArgumentException("Username, E-Mail und Passwort sind erforderlich");
        }

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Benutzername existiert bereits");
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("E-Mail existiert bereits");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmailVerified(!emailVerificationRequired);

        Role userRole = roleRepository.findByName("USER")
                .orElseThrow(() -> new RuntimeException("Role USER not found"));

        user.getRoles().add(userRole);

        User savedUser = userRepository.save(user);

        if (emailVerificationRequired) {
            emailVerificationService.createAndSendVerification(savedUser);
            return new AuthResponse(savedUser.getUsername(), savedUser.getEmail(), false,
                    "Bitte bestaetige deine E-Mail-Adresse ueber den Link in der E-Mail.", true);
        }

        return new AuthResponse(savedUser.getUsername(), savedUser.getEmail(), true,
                "Registrierung erfolgreich.", false);
    }

    public User login(String username, String rawPassword) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Benutzer nicht gefunden"));

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new IllegalArgumentException("Passwort ist ungueltig");
        }

        if (emailVerificationRequired && !user.isEmailVerified()) {
            throw new IllegalStateException("Bitte bestaetige zuerst deine E-Mail-Adresse");
        }

        return user;
    }

    public boolean isEmailVerificationRequired() {
        return emailVerificationRequired;
    }

}
