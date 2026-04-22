package com.etftracker.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class EtfPreferenceRequest {

    private List<String> selectedSymbols = new ArrayList<>();
    private List<EtfItem> customEtfs = new ArrayList<>();

    public List<String> getSelectedSymbols() {
        return selectedSymbols;
    }

    public void setSelectedSymbols(List<String> selectedSymbols) {
        this.selectedSymbols = selectedSymbols;
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
    }
}
