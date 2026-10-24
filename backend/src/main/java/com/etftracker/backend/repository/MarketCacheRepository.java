package com.etftracker.backend.repository;

import com.etftracker.backend.entity.MarketCache;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketCacheRepository extends JpaRepository<MarketCache, String> {
}
