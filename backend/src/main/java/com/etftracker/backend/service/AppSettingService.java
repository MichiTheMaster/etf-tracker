package com.etftracker.backend.service;

import com.etftracker.backend.dto.AppSettingDto;
import com.etftracker.backend.entity.AppSetting;
import com.etftracker.backend.repository.AppSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AppSettingService {

    private static final String MARKET_ALIAS_PREFIX = "market.alias.";

    private final AppSettingRepository appSettingRepository;

    public AppSettingService(AppSettingRepository appSettingRepository) {
        this.appSettingRepository = appSettingRepository;
    }

    public List<AppSettingDto> findAll() {
        return appSettingRepository.findAll().stream()
                .sorted((a, b) -> a.getKey().compareToIgnoreCase(b.getKey()))
                .map(setting -> new AppSettingDto(setting.getKey(), setting.getValue()))
                .toList();
    }

    public String findValue(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        return appSettingRepository.findById(key.trim())
                .map(AppSetting::getValue)
                .orElse(null);
    }

    public boolean getBoolean(String key, boolean defaultValue) {
        String value = findValue(key);
        if (value == null || value.isBlank()) {
            return defaultValue;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("true") || normalized.equals("1") || normalized.equals("yes")) {
            return true;
        }
        if (normalized.equals("false") || normalized.equals("0") || normalized.equals("no")) {
            return false;
        }

        return defaultValue;
    }

    public Map<String, String> getMarketAliases() {
        Map<String, String> aliases = new LinkedHashMap<>();
        List<AppSetting> storedAliases = appSettingRepository.findByKeyStartingWith(MARKET_ALIAS_PREFIX);
        for (AppSetting entry : storedAliases) {
            String rawBase = entry.getKey().substring(MARKET_ALIAS_PREFIX.length()).trim();
            String rawTarget = entry.getValue() == null ? "" : entry.getValue().trim();
            if (rawBase.isBlank() || rawTarget.isBlank()) {
                continue;
            }
            aliases.put(rawBase.toUpperCase(Locale.ROOT), rawTarget.toUpperCase(Locale.ROOT));
        }
        return aliases;
    }

    @Transactional
    public AppSettingDto upsert(AppSettingDto dto) {
        if (dto == null || dto.getKey() == null || dto.getKey().isBlank()) {
            throw new IllegalArgumentException("Key ist erforderlich");
        }

        String key = dto.getKey().trim();
        String value = dto.getValue() == null ? "" : dto.getValue().trim();
        AppSetting setting = appSettingRepository.findById(key).orElse(new AppSetting());
        setting.setKey(key);
        setting.setValue(value);
        AppSetting saved = appSettingRepository.save(setting);
        return new AppSettingDto(saved.getKey(), saved.getValue());
    }

    @Transactional
    public void delete(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        appSettingRepository.deleteById(key.trim());
    }
}