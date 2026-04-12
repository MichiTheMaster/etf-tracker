package com.etftracker.backend.controller;

import com.etftracker.backend.service.AppSettingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class AppSettingsController {

    private static final String INACTIVITY_TIMEOUT_KEY = "app.session.inactivityTimeoutMinutes";
    private static final String INACTIVITY_WARNING_KEY = "app.session.inactivityWarningMinutes";

    private final AppSettingService appSettingService;

    public AppSettingsController(AppSettingService appSettingService) {
        this.appSettingService = appSettingService;
    }

    @GetMapping("/inactivity")
    public Map<String, Integer> getInactivitySettings() {
        int timeoutMinutes = appSettingService.getInt(INACTIVITY_TIMEOUT_KEY, 30, 5, 240);
        int warningMinutes = appSettingService.getInt(INACTIVITY_WARNING_KEY, 28, 1, 239);

        if (warningMinutes >= timeoutMinutes) {
            warningMinutes = Math.max(1, timeoutMinutes - 1);
        }

        return Map.of(
                "timeoutMinutes", timeoutMinutes,
                "warningMinutes", warningMinutes
        );
    }
}
