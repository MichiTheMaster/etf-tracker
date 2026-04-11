package com.etftracker.backend.dto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EtfPreferenceResponse {
    public List<String> selectedSymbols = new ArrayList<>();
    public Map<String, String> selectedAddedAt = new HashMap<>();
    public List<EtfItem> customEtfs = new ArrayList<>();

    public static class EtfItem {
        public String symbol;
        public String name;
        public Double price;
        public Double ter;
        public String source;
        public String addedAt;

        public EtfItem(String symbol, String name, Double price, Double ter, String source, String addedAt) {
            this.symbol = symbol;
            this.name = name;
            this.price = price;
            this.ter = ter;
            this.source = source;
            this.addedAt = addedAt;
        }
    }
}
