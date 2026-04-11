package com.etftracker.backend.controller;

import com.etftracker.backend.dto.EtfPoolItemResponse;
import com.etftracker.backend.dto.QuoteResponse;
import com.etftracker.backend.service.MarketDataService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/market")
public class MarketController {

    private final MarketDataService marketDataService;

    public MarketController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/quotes")
    public Map<String, QuoteResponse> getQuotes(
            @RequestParam(defaultValue = "VWCE,EUNL,EMIM,SXR8,EXSA,SPYD") String symbols,
            @RequestParam(defaultValue = "false") boolean force,
            @RequestParam(defaultValue = "false") boolean debug) {
        List<String> symbolList = Arrays.asList(symbols.split(","));
        return marketDataService.getQuotes(symbolList, force, debug);
    }

    @GetMapping("/debug")
    public Map<String, Object> debug(@RequestParam String symbol) {
        return marketDataService.getRawResponse(symbol);
    }

    @GetMapping("/pool")
    public List<EtfPoolItemResponse> pool(
            @RequestParam(defaultValue = "iShares") String q,
            @RequestParam(defaultValue = "15") int limit) {
        int sanitizedLimit = Math.max(1, Math.min(limit, 50));
        return marketDataService.searchEtfs(q, sanitizedLimit);
    }
}
