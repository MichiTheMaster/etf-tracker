package com.etftracker.backend.service;

import com.etftracker.backend.entity.PasswordResetToken;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.PasswordResetTokenRepository;
import com.etftracker.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${app.public-base-url:http://localhost:3000}")
    private String publicBaseUrl;

    @Value("${app.password-reset.token-valid-hours:1}")
    private long tokenValidHours;

    @Value("${app.mail.from:no-reply@etf-tracker.local}")
    private String mailFrom;

    public PasswordResetService(PasswordResetTokenRepository tokenRepository,
            UserRepository userRepository,
            ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSenderProvider.getIfAvailable();
    }

    @Transactional
    public void createAndSendResetToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Keine Benutzer mit dieser E-Mail-Adresse gefunden"));

        if (!user.isEmailVerified()) {
            throw new IllegalArgumentException("E-Mail-Adresse ist nicht verifiziert");
        }

        tokenRepository.deleteByUser_Id(user.getId());

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(UUID.randomUUID().toString());
        resetToken.setExpiresAt(Instant.now().plus(tokenValidHours, ChronoUnit.HOURS));
        tokenRepository.save(resetToken);

        String resetUrl = buildResetUrl(resetToken.getToken());

        if (mailSender == null) {
            throw new IllegalStateException("Passwort-Reset ist aktiviert, aber SMTP ist nicht konfiguriert");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(user.getEmail());
        message.setFrom(mailFrom);
        message.setSubject("ETF Tracker: Passwort zurücksetzen");
        message.setText(
                "Hallo " + user.getUsername() + ",\n\n"
                        + "du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.\n"
                        + "Klicke auf diesen Link, um dein Passwort zurückzusetzen:\n"
                        + resetUrl + "\n\n"
                        + "Der Link ist " + tokenValidHours + " Stunde(n) gültig.\n\n"
                        + "Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.");
        mailSender.send(message);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Reset-Link ist ungültig"));

        if (resetToken.getUsedAt() != null) {
            throw new IllegalArgumentException("Reset-Link wurde bereits verwendet");
        }

        if (resetToken.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Reset-Link ist abgelaufen");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsedAt(Instant.now());
        tokenRepository.save(resetToken);
    }

    private String buildResetUrl(String token) {
        return publicBaseUrl.replaceAll("/+$", "") + "/#/reset-password?token=" + token;
    }
}