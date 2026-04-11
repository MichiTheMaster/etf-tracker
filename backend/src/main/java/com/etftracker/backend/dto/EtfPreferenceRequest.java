package com.etftracker.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class EtfPreferenceRequest {
    public List<String> selectedSymbols = new ArrayList<>();
    public List<EtfItem> customEtfs = new ArrayList<>();

    public static class EtfItem {
        public String symbol;
        public String name;
        public Double price;
        public Double ter;
        public String source;
    }
}
