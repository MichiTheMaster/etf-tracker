package com.etftracker.backend.controller;

import com.etftracker.backend.config.MarketSymbols;
import com.etftracker.backend.dto.EtfPoolItemResponse;
import com.etftracker.backend.dto.MarketRiskResponse;
import com.etftracker.backend.dto.QuoteResponse;
import com.etftracker.backend.service.MarketDataService;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/market")
public class MarketController {

    private static final String DEFAULT_SYMBOLS = "VWCE,EUNL,EMIM,SXR8,EXSA,SPYD";

    private final MarketDataService marketDataService;

    public MarketController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/quotes")
    public Map<String, QuoteResponse> getQuotes(
            @RequestParam(defaultValue = DEFAULT_SYMBOLS) String symbols,
            @RequestParam(defaultValue = "false") boolean force,
            @RequestParam(defaultValue = "false") boolean debug,
            Authentication authentication) {
        boolean trusted = isAuthenticated(authentication);
        List<String> symbolList = MarketSymbols.parse(symbols);
        if (symbolList.isEmpty()) {
            symbolList = MarketSymbols.parse(DEFAULT_SYMBOLS);
        }
        return marketDataService.getQuotes(symbolList, force && trusted, debug && trusted);
    }

    @GetMapping("/risk")
    public Map<String, MarketRiskResponse> getRisk(
            @RequestParam(defaultValue = DEFAULT_SYMBOLS) String symbols) {
        List<String> symbolList = MarketSymbols.parse(symbols);
        if (symbolList.isEmpty()) {
            symbolList = MarketSymbols.parse(DEFAULT_SYMBOLS);
        }
        return marketDataService.getRiskMetrics(symbolList);
    }

    @GetMapping("/debug")
    public Map<String, Object> debug(@RequestParam String symbol) {
        List<String> symbolList = MarketSymbols.parse(symbol);
        String safeSymbol = symbolList.isEmpty() ? "" : symbolList.get(0);
        return marketDataService.getRawResponse(safeSymbol);
    }

    @GetMapping("/pool")
    public List<EtfPoolItemResponse> pool(
            @RequestParam(defaultValue = "iShares") String q,
            @RequestParam(defaultValue = "15") int limit) {
        String query = q == null ? "" : q.trim();
        if (query.length() > 80) {
            query = query.substring(0, 80);
        }
        int sanitizedLimit = Math.clamp(limit, 1, 50);
        return marketDataService.searchEtfs(query, sanitizedLimit);
    }

    private static boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }
}
