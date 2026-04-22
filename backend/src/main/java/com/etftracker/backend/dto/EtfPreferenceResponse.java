package com.etftracker.backend.dto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EtfPreferenceResponse {

    private List<String> selectedSymbols = new ArrayList<>();
    private Map<String, String> selectedAddedAt = new HashMap<>();
    private List<EtfItem> customEtfs = new ArrayList<>();

    public List<String> getSelectedSymbols() {
        return selectedSymbols;
    }

    public void setSelectedSymbols(List<String> selectedSymbols) {
        this.selectedSymbols = selectedSymbols;
    }

    public Map<String, String> getSelectedAddedAt() {
        return selectedAddedAt;
    }

    public void setSelectedAddedAt(Map<String, String> selectedAddedAt) {
        this.selectedAddedAt = selectedAddedAt;
    }

    public List<EtfItem> getCustomEtfs() {
        return customEtfs;
    }

    public void setCustomEtfs(List<EtfItem> customEtfs) {
        this.customEtfs = customEtfs;
    }

    public static class EtfItem {

        private String symbol;
        private String name;
        private Double price;
        private Double ter;
        private String source;
        private String addedAt;

        public EtfItem() {
        }

        public EtfItem(String symbol, String name, Double price, Double ter, String source, String addedAt) {
            this.symbol = symbol;
            this.name = name;
            this.price = price;
            this.ter = ter;
            this.source = source;
            this.addedAt = addedAt;
        }

        public String getSymbol() {
            return symbol;
        }

        public void setSymbol(String symbol) {
            this.symbol = symbol;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Double getPrice() {
            return price;
        }

        public void setPrice(Double price) {
            this.price = price;
        }

        public Double getTer() {
            return ter;
        }

        public void setTer(Double ter) {
            this.ter = ter;
        }

        public String getSource() {
            return source;
        }

        public void setSource(String source) {
            this.source = source;
        }

        public String getAddedAt() {
            return addedAt;
        }

        public void setAddedAt(String addedAt) {
            this.addedAt = addedAt;
        }
    }
}
