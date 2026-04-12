package com.etftracker.backend.repository;

import com.etftracker.backend.entity.AppSettingHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppSettingHistoryRepository extends JpaRepository<AppSettingHistory, Long> {
    List<AppSettingHistory> findTop200ByOrderByChangedAtDesc();
}
