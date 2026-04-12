package com.etftracker.backend.service;

import com.etftracker.backend.dto.AppSettingHistoryDto;
import com.etftracker.backend.entity.AppSettingHistory;
import com.etftracker.backend.repository.AppSettingHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class AppSettingHistoryService {

    private final AppSettingHistoryRepository appSettingHistoryRepository;

    public AppSettingHistoryService(AppSettingHistoryRepository appSettingHistoryRepository) {
        this.appSettingHistoryRepository = appSettingHistoryRepository;
    }

    @Transactional
    public void recordChange(String settingKey, String oldValue, String newValue, String changeType, String changedBy) {
        appSettingHistoryRepository.save(new AppSettingHistory(
                settingKey,
                oldValue,
                newValue,
                changeType,
                changedBy,
                Instant.now()));
    }

    @Transactional(readOnly = true)
    public List<AppSettingHistoryDto> getRecentHistory() {
        return appSettingHistoryRepository.findTop200ByOrderByChangedAtDesc().stream()
                .map(entry -> new AppSettingHistoryDto(
                        entry.getId(),
                        entry.getSettingKey(),
                        entry.getOldValue(),
                        entry.getNewValue(),
                        entry.getChangeType(),
                        entry.getChangedBy(),
                        entry.getChangedAt()))
                .toList();
    }
}
