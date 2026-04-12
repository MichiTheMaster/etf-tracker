package com.etftracker.backend.config;

import com.etftracker.backend.entity.Role;
import com.etftracker.backend.repository.RoleRepository;
import com.etftracker.backend.service.AppSettingService;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final AppSettingService appSettingService;

    public DataInitializer(RoleRepository roleRepository, AppSettingService appSettingService) {
        this.roleRepository = roleRepository;
        this.appSettingService = appSettingService;
    }

    @Override
    public void run(String... args) {

        if (roleRepository.findByName("USER").isEmpty()) {
            roleRepository.save(new Role("USER"));
            System.out.println("✔ Rolle USER angelegt");
        }

        if (roleRepository.findByName("ADMIN").isEmpty()) {
            roleRepository.save(new Role("ADMIN"));
            System.out.println("✔ Rolle ADMIN angelegt");
        }

        seedAppSettings();
    }

    private void seedAppSettings() {
        appSettingService.upsertIfAbsent("app.session.inactivityTimeoutMinutes", "30");
        appSettingService.upsertIfAbsent("app.session.inactivityWarningMinutes", "28");
        appSettingService.upsertIfAbsent("market.fallbackPricesEnabled", "true");

        cleanupLegacySxrsAlias();

        Map<String, String> fallbackPrices = new LinkedHashMap<>();
        fallbackPrices.put("market.fallbackPrice.SPY", "520.0");
        fallbackPrices.put("market.fallbackPrice.VWCE", "116.2");
        fallbackPrices.put("market.fallbackPrice.EUNL", "89.45");
        fallbackPrices.put("market.fallbackPrice.EMIM", "33.8");
        fallbackPrices.put("market.fallbackPrice.SXR8", "520.9");
        fallbackPrices.put("market.fallbackPrice.EXSA", "50.4");
        fallbackPrices.put("market.fallbackPrice.SPYD", "62.7");
        fallbackPrices.put("market.fallbackPrice.VUSA", "95.8");
        fallbackPrices.put("market.fallbackPrice.CSPX", "560.1");
        fallbackPrices.put("market.fallbackPrice.IUSN", "54.2");
        fallbackPrices.put("market.fallbackPrice.EIMI", "35.7");

        fallbackPrices.forEach(appSettingService::upsertIfAbsent);
    }

    private void cleanupLegacySxrsAlias() {
        final String cleanupFlag = "migration.2026-04-12.cleanupLegacySxrsAlias";
        if (appSettingService.findValue(cleanupFlag) != null) {
            return;
        }

        String legacyAlias = appSettingService.findValue("market.alias.SXRS");
        if (legacyAlias != null && "SXR8".equalsIgnoreCase(legacyAlias.trim())) {
            appSettingService.delete("market.alias.SXRS");
        }

        appSettingService.upsertIfAbsent(cleanupFlag, "true");
    }
}
