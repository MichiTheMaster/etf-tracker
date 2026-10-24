package com.etftracker.backend.service;

import com.etftracker.backend.repository.PositionRepository;
import com.etftracker.backend.repository.UserEtfSelectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class MarketCacheWarmupService {

    private static final Logger log = LoggerFactory.getLogger(MarketCacheWarmupService.class);
    private static final List<String> DEFAULT_SYMBOLS = List.of(
            "VWCE", "EUNL", "EMIM", "IS3N", "SXR8", "EXSA", "SPYD", "VUSA", "CSPX", "IUSN", "EIMI");

    private final MarketDataService marketDataService;
    private final PositionRepository positionRepository;
    private final UserEtfSelectionRepository userEtfSelectionRepository;

    public MarketCacheWarmupService(
            MarketDataService marketDataService,
            PositionRepository positionRepository,
            UserEtfSelectionRepository userEtfSelectionRepository) {
        this.marketDataService = marketDataService;
        this.positionRepository = positionRepository;
        this.userEtfSelectionRepository = userEtfSelectionRepository;
    }

    @Scheduled(fixedDelayString = "${app.market.cache.warmup-delay-ms:300000}",
            initialDelayString = "${app.market.cache.warmup-initial-delay-ms:20000}")
    public void warmupSharedCache() {
        Set<String> symbols = new LinkedHashSet<>(DEFAULT_SYMBOLS);
        symbols.addAll(positionRepository.findDistinctSymbols());
        symbols.addAll(userEtfSelectionRepository.findDistinctSymbols());
        symbols.removeIf(symbol -> symbol == null || symbol.isBlank());

        List<String> requested = new ArrayList<>(symbols);
        log.debug("Warming market cache for {} symbols", requested.size());
        marketDataService.getQuotes(requested, false, false);
        marketDataService.getRiskMetrics(requested);
    }
}
