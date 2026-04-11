package com.etftracker.backend.controller;

import com.etftracker.backend.dto.BuyEtfRequest;
import com.etftracker.backend.dto.EtfPreferenceRequest;
import com.etftracker.backend.dto.EtfPreferenceResponse;
import com.etftracker.backend.dto.PortfolioResponse;
import com.etftracker.backend.dto.SellEtfRequest;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.UserRepository;
import com.etftracker.backend.service.EtfPreferenceService;
import com.etftracker.backend.service.PortfolioService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {

    private final PortfolioService portfolioService;
    private final EtfPreferenceService etfPreferenceService;
    private final UserRepository userRepository;

    public PortfolioController(PortfolioService portfolioService, EtfPreferenceService etfPreferenceService,
            UserRepository userRepository) {
        this.portfolioService = portfolioService;
        this.etfPreferenceService = etfPreferenceService;
        this.userRepository = userRepository;
    }

    @GetMapping("/load")
    public ResponseEntity<?> loadPortfolio() {
        try {
            User user = getCurrentUser();
            PortfolioResponse response = portfolioService.getPortfolioState(user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorMessage(e.getMessage()));
        }
    }

    @PostMapping("/buy")
    public ResponseEntity<?> buyEtf(@RequestBody BuyEtfRequest request) {
        try {
            User user = getCurrentUser();
            PortfolioResponse response = portfolioService.buyEtf(user, request.symbol, request.quantity, request.price);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorMessage(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new ErrorMessage("Fehler beim Kauf: " + e.getMessage()));
        }
    }

    @PostMapping("/sell")
    public ResponseEntity<?> sellEtf(@RequestBody SellEtfRequest request) {
        try {
            User user = getCurrentUser();
            PortfolioResponse response = portfolioService.sellEtf(user, request.symbol, request.quantity,
                    request.price);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorMessage(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new ErrorMessage("Fehler beim Verkauf: " + e.getMessage()));
        }
    }

    @GetMapping("/etfs")
    public ResponseEntity<?> loadEtfPreferences() {
        try {
            User user = getCurrentUser();
            EtfPreferenceResponse response = etfPreferenceService.load(user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorMessage(e.getMessage()));
        }
    }

    @PostMapping("/etfs")
    public ResponseEntity<?> saveEtfPreferences(@RequestBody EtfPreferenceRequest request) {
        try {
            User user = getCurrentUser();
            EtfPreferenceResponse response = etfPreferenceService.save(user, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorMessage(e.getMessage()));
        }
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalArgumentException("Nicht authentifiziert.");
        }

        String username = auth.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User nicht gefunden."));
    }

    static class ErrorMessage {
        public String error;

        ErrorMessage(String error) {
            this.error = error;
        }
    }
}
