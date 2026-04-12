package com.etftracker.backend.service;

import com.etftracker.backend.entity.EmailVerificationToken;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.EmailVerificationTokenRepository;
import com.etftracker.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class EmailVerificationService {

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    @Value("${app.public-base-url:http://localhost:3000}")
    private String publicBaseUrl;

    @Value("${app.email-verification.token-valid-hours:24}")
    private long tokenValidHours;

    @Value("${app.mail.from:no-reply@etf-tracker.local}")
    private String mailFrom;

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepository,
            UserRepository userRepository,
            ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSenderProvider.getIfAvailable();
    }

    @Transactional
    public void createAndSendVerification(User user) {
        tokenRepository.deleteByUser_Id(user.getId());

        EmailVerificationToken verificationToken = new EmailVerificationToken();
        verificationToken.setUser(user);
        verificationToken.setToken(UUID.randomUUID().toString());
        verificationToken.setExpiresAt(Instant.now().plus(tokenValidHours, ChronoUnit.HOURS));
        tokenRepository.save(verificationToken);

        String verifyUrl = buildVerificationUrl(verificationToken.getToken());

        if (mailSender == null) {
            throw new IllegalStateException("E-Mail-Verifikation ist aktiviert, aber SMTP ist nicht konfiguriert");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(user.getEmail());
        message.setFrom(mailFrom);
        message.setSubject("ETF Tracker: Bitte E-Mail bestaetigen");
        message.setText(
                "Hallo " + user.getUsername() + ",\n\n"
                        + "bitte bestaetige deine E-Mail-Adresse mit diesem Link:\n"
                        + verifyUrl + "\n\n"
                        + "Der Link ist " + tokenValidHours + " Stunden gueltig.");
        mailSender.send(message);
    }

    @Transactional
    public void verifyEmail(String token) {
        EmailVerificationToken verificationToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Verifizierungslink ist ungueltig"));

        if (verificationToken.getUsedAt() != null) {
            throw new IllegalArgumentException("Verifizierungslink wurde bereits verwendet");
        }

        if (verificationToken.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Verifizierungslink ist abgelaufen");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        verificationToken.setUsedAt(Instant.now());
        tokenRepository.save(verificationToken);
    }

    private String buildVerificationUrl(String token) {
        return publicBaseUrl.replaceAll("/+$", "") + "/#/verify-email?token=" + token;
    }
}