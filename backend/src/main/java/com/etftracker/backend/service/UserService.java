package com.etftracker.backend.service;

import com.etftracker.backend.dto.LoginAttemptResult;
import com.etftracker.backend.dto.RegisterRequest;
import com.etftracker.backend.dto.AuthResponse;
import com.etftracker.backend.entity.Role;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.RoleRepository;
import com.etftracker.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class UserService {

    private static final String USER_NOT_FOUND = "Benutzer nicht gefunden";
    private static final String MAX_FAILED_LOGIN_ATTEMPTS_KEY = "app.security.maxFailedLoginAttempts";
    private static final String LOCK_DURATION_MINUTES_KEY = "app.security.lockDurationMinutes";
    private static final int MAX_FAILED_LOGIN_ATTEMPTS_DEFAULT = 5;
    private static final int LOCK_DURATION_MINUTES_DEFAULT = 30;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmailVerificationService emailVerificationService;
    private final AppSettingService appSettingService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${app.email-verification.required:false}")
    private boolean emailVerificationRequired;

    public UserService(UserRepository userRepository, RoleRepository roleRepository,
            EmailVerificationService emailVerificationService, AppSettingService appSettingService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.emailVerificationService = emailVerificationService;
        this.appSettingService = appSettingService;
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

    public LoginAttemptResult login(String username, String rawPassword, String ipAddress, String userAgent) {

        String normalizedUsername = username == null ? "" : username.trim();
        String normalizedIp = normalize(ipAddress, 64);
        String normalizedUserAgent = normalize(userAgent, 255);

        User user = userRepository.findByUsername(normalizedUsername)
                .orElseThrow(() -> new IllegalArgumentException(USER_NOT_FOUND));

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw new IllegalStateException("Konto ist bis " + user.getLockedUntil() + " gesperrt");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            registerFailedLogin(user);
            if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
                throw new IllegalStateException("Konto ist fuer " + getLockDurationMinutes() + " Minuten gesperrt");
            }
            throw new IllegalArgumentException("Passwort ist ungueltig");
        }

        if (emailVerificationRequired && !user.isEmailVerified()) {
            throw new IllegalStateException("Bitte bestaetige zuerst deine E-Mail-Adresse");
        }

        boolean newIp = normalizedIp != null && !normalizedIp.equals(user.getLastLoginIp())
                && user.getLastLoginIp() != null;
        boolean newDevice = normalizedUserAgent != null
                && !normalizedUserAgent.equals(user.getLastLoginUserAgent())
                && user.getLastLoginUserAgent() != null;

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        user.setLastLoginIp(normalizedIp);
        user.setLastLoginUserAgent(normalizedUserAgent);
        User savedUser = userRepository.save(user);

        List<String> signals = new ArrayList<>();
        if (newIp) {
            signals.add("neue IP");
        }
        if (newDevice) {
            signals.add("neues Geraet");
        }

        String loginDetails = buildLoginDetails(normalizedIp, normalizedUserAgent, signals);
        return new LoginAttemptResult(savedUser, !signals.isEmpty(), String.join(", ", signals), loginDetails);
    }

    public boolean isEmailVerificationRequired() {
        return emailVerificationRequired;
    }

    public void unlockAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(USER_NOT_FOUND));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }

    public void lockAccount(Long userId, Integer minutesOverride) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(USER_NOT_FOUND));
        int lockMinutes = minutesOverride != null && minutesOverride > 0
                ? Math.min(minutesOverride, 1440)
                : getLockDurationMinutes();
        user.setLockedUntil(Instant.now().plus(lockMinutes, ChronoUnit.MINUTES));
        user.setFailedLoginAttempts(Math.max(user.getFailedLoginAttempts(), getMaxFailedLoginAttempts()));
        userRepository.save(user);
    }

    public void changePassword(String username, String currentPassword, String newPassword) {
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new IllegalArgumentException("Aktuelles Passwort darf nicht leer sein");
        }
        validatePasswordStrength(newPassword);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException(USER_NOT_FOUND));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Aktuelles Passwort ist falsch");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void changeEmail(String username, String currentPassword, String newEmail) {
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new IllegalArgumentException("Passwort darf nicht leer sein");
        }
        if (newEmail == null || newEmail.isBlank()) {
            throw new IllegalArgumentException("E-Mail darf nicht leer sein");
        }

        String normalizedEmail = newEmail.trim();
        if (!normalizedEmail.matches("^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+)$")) {
            throw new IllegalArgumentException("Ungültige E-Mail-Adresse");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException(USER_NOT_FOUND));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Passwort ist falsch");
        }

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Diese E-Mail-Adresse wird bereits verwendet");
        }

        user.setEmail(normalizedEmail);
        user.setEmailVerified(false);
        userRepository.save(user);

        if (emailVerificationRequired) {
            emailVerificationService.createAndSendVerification(user);
        }
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Passwort muss mindestens 8 Zeichen lang sein");
        }
        if (!password.chars().anyMatch(Character::isUpperCase)) {
            throw new IllegalArgumentException("Passwort muss mindestens einen Großbuchstaben enthalten");
        }
        if (!password.chars().anyMatch(Character::isLowerCase)) {
            throw new IllegalArgumentException("Passwort muss mindestens einen Kleinbuchstaben enthalten");
        }
        if (!password.chars().anyMatch(Character::isDigit)) {
            throw new IllegalArgumentException("Passwort muss mindestens eine Zahl enthalten");
        }
        if (!password.chars().anyMatch(c -> "!@#$%^&*()_+-=[]{}|;':\",./<>?".indexOf(c) >= 0)) {
            throw new IllegalArgumentException("Passwort muss mindestens ein Sonderzeichen enthalten (!@#$%^&*...)");
        }
    }

    private void registerFailedLogin(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= getMaxFailedLoginAttempts()) {
            user.setLockedUntil(Instant.now().plus(getLockDurationMinutes(), ChronoUnit.MINUTES));
        }
        userRepository.save(user);
    }

    private int getMaxFailedLoginAttempts() {
        return appSettingService.getInt(MAX_FAILED_LOGIN_ATTEMPTS_KEY, MAX_FAILED_LOGIN_ATTEMPTS_DEFAULT, 3, 20);
    }

    private int getLockDurationMinutes() {
        return appSettingService.getInt(LOCK_DURATION_MINUTES_KEY, LOCK_DURATION_MINUTES_DEFAULT, 5, 1440);
    }

    private String buildLoginDetails(String ipAddress, String userAgent, List<String> signals) {
        String ipPart = ipAddress == null || ipAddress.isBlank() ? "IP: unbekannt" : "IP: " + ipAddress;
        String agentPart = userAgent == null || userAgent.isBlank() ? "Client: unbekannt" : "Client: " + userAgent;
        if (signals.isEmpty()) {
            return ipPart + " | " + agentPart;
        }
        return ipPart + " | " + agentPart + " | Hinweis: " + String.join(", ", signals);
    }

    private String normalize(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

}
