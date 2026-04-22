package com.etftracker.backend.service;

import com.etftracker.backend.dto.EtfPreferenceRequest;
import com.etftracker.backend.dto.EtfPreferenceResponse;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.entity.UserEtfSelection;
import com.etftracker.backend.repository.UserEtfSelectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.time.format.DateTimeFormatter;

@Service
public class EtfPreferenceService {

    private static final Set<String> DEFAULT_SYMBOLS = Set.of("VWCE", "EUNL", "EMIM", "SXR8", "EXSA", "SPYD");

    private final UserEtfSelectionRepository userEtfSelectionRepository;

    public EtfPreferenceService(UserEtfSelectionRepository userEtfSelectionRepository) {
        this.userEtfSelectionRepository = userEtfSelectionRepository;
    }

    @Transactional(readOnly = true)
    public EtfPreferenceResponse load(User user) {
        List<UserEtfSelection> items = userEtfSelectionRepository.findByUser(user);

        EtfPreferenceResponse response = new EtfPreferenceResponse();

        items.stream()
                .filter(UserEtfSelection::isSelected)
                .map(UserEtfSelection::getSymbol)
                .sorted()
                .forEach(response.getSelectedSymbols()::add);

        items.stream()
                .filter(UserEtfSelection::isSelected)
                .forEach(item -> response.getSelectedAddedAt().put(
                        item.getSymbol(),
                        item.getCreatedAt() == null ? null
                                : item.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME)));

        items.stream()
                .filter(UserEtfSelection::isCustom)
                .sorted(Comparator.comparing(UserEtfSelection::getSymbol))
                .forEach(item -> response.getCustomEtfs().add(
                        new EtfPreferenceResponse.EtfItem(
                                item.getSymbol(),
                                item.getName(),
                                item.getPrice().doubleValue(),
                                item.getTer().doubleValue(),
                                item.getSource() != null && !item.getSource().isBlank() ? item.getSource()
                                        : "custom",
                                item.getCreatedAt() == null ? null
                                        : item.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME))));

        if (response.getSelectedSymbols().isEmpty()) {
            List<String> defaultSymbols = new ArrayList<>(DEFAULT_SYMBOLS);
            defaultSymbols.sort(String::compareTo);
            response.setSelectedSymbols(defaultSymbols);
        }

        return response;
    }

    @Transactional
    public EtfPreferenceResponse save(User user, EtfPreferenceRequest request) {
        List<String> selectedSymbols = request.getSelectedSymbols() == null ? List.of() : request.getSelectedSymbols();
        List<EtfPreferenceRequest.EtfItem> customEtfs = request.getCustomEtfs() == null ? List.of()
                : request.getCustomEtfs();

        Map<String, EtfPreferenceRequest.EtfItem> customBySymbol = new HashMap<>();
        for (EtfPreferenceRequest.EtfItem item : customEtfs) {
            if (item == null || item.getSymbol() == null || item.getSymbol().isBlank()) {
                continue;
            }
            String normalizedSymbol = item.getSymbol().trim().toUpperCase(Locale.ROOT);
            customBySymbol.put(normalizedSymbol, item);
        }

        Set<String> selectedSet = new HashSet<>();
        for (String symbol : selectedSymbols) {
            if (symbol == null || symbol.isBlank()) {
                continue;
            }
            selectedSet.add(symbol.trim().toUpperCase(Locale.ROOT));
        }

        // Load existing selections BEFORE deleting to preserve createdAt timestamps
        List<UserEtfSelection> existingSelections = userEtfSelectionRepository.findByUser(user);
        Map<String, java.time.LocalDateTime> existingCreatedAtBySymbol = new HashMap<>();
        for (UserEtfSelection existing : existingSelections) {
            if (existing.getCreatedAt() != null) {
                existingCreatedAtBySymbol.put(existing.getSymbol(), existing.getCreatedAt());
            }
        }

        userEtfSelectionRepository.deleteByUser(user);
        userEtfSelectionRepository.flush();

        List<UserEtfSelection> toSave = new ArrayList<>();
        for (String symbol : selectedSet) {
            boolean isCustom = customBySymbol.containsKey(symbol);
            EtfPreferenceRequest.EtfItem custom = customBySymbol.get(symbol);

            String name = isCustom && custom.getName() != null && !custom.getName().isBlank()
                    ? custom.getName().trim()
                    : symbol;
            BigDecimal price = isCustom && custom.getPrice() != null && custom.getPrice() > 0
                    ? BigDecimal.valueOf(custom.getPrice())
                    : BigDecimal.ZERO;
            BigDecimal ter = isCustom && custom.getTer() != null && custom.getTer() >= 0
                    ? BigDecimal.valueOf(custom.getTer())
                    : BigDecimal.ZERO;

            String source = isCustom && custom.getSource() != null && !custom.getSource().isBlank()
                    ? custom.getSource().trim()
                    : isCustom ? "custom" : null;

            UserEtfSelection selection = new UserEtfSelection(user, symbol, name, price, ter, true, isCustom);
            selection.setSource(source);

            // Preserve the original createdAt timestamp if this symbol was already selected
            if (existingCreatedAtBySymbol.containsKey(symbol)) {
                selection.setCreatedAt(existingCreatedAtBySymbol.get(symbol));
            }

            toSave.add(selection);
        }

        userEtfSelectionRepository.saveAll(toSave);

        return load(user);
    }
}
