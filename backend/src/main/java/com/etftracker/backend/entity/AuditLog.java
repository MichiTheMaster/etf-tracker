package com.etftracker.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Benutzername, der die Aktion ausgeführt hat */
    @Column(nullable = false, length = 120)
    private String username;

    /** Kategorie der Aktion, z.B. PORTFOLIO, AUTH, ADMIN */
    @Column(nullable = false, length = 40)
    private String category;

    /** Kurzbeschreibung, z.B. "ETF gekauft", "Passwort geändert" */
    @Column(nullable = false, length = 255)
    private String action;

    /** Optionale Detailangaben (Symbol, Menge, betroffener Nutzer, …) */
    @Column(length = 1000)
    private String details;

    @Column(nullable = false)
    private Instant timestamp;

    public AuditLog() {
    }

    public AuditLog(String username, String category, String action, String details) {
        this.username = username;
        this.category = category;
        this.action = action;
        this.details = details;
        this.timestamp = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getCategory() {
        return category;
    }

    public String getAction() {
        return action;
    }

    public String getDetails() {
        return details;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
