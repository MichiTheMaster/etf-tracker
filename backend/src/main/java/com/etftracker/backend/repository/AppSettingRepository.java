package com.etftracker.backend.repository;

import com.etftracker.backend.entity.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {
    List<AppSetting> findByKeyStartingWith(String prefix);
}