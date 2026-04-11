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
                .forEach(response.selectedSymbols::add);

        items.stream()
                .filter(UserEtfSelection::isSelected)
                .forEach(item -> response.selectedAddedAt.put(
                        item.getSymbol(),
                        item.getCreatedAt() == null ? null
                                : item.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME)));

        items.stream()
                .filter(UserEtfSelection::isCustom)
                .sorted(Comparator.comparing(UserEtfSelection::getSymbol))
                .forEach(item -> response.customEtfs.add(
                        new EtfPreferenceResponse.EtfItem(
                                item.getSymbol(),
                                item.getName(),
                                item.getPrice().doubleValue(),
                                item.getTer().doubleValue(),
                                item.getSource() != null && !item.getSource().isBlank() ? item.getSource()
                                        : "custom",
                                item.getCreatedAt() == null ? null
                                        : item.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME))));

        if (response.selectedSymbols.isEmpty()) {
            response.selectedSymbols = new ArrayList<>(DEFAULT_SYMBOLS);
            response.selectedSymbols.sort(String::compareTo);
        }

        return response;
    }

    @Transactional
    public EtfPreferenceResponse save(User user, EtfPreferenceRequest request) {
        List<String> selectedSymbols = request.selectedSymbols == null ? List.of() : request.selectedSymbols;
        List<EtfPreferenceRequest.EtfItem> customEtfs = request.customEtfs == null ? List.of() : request.customEtfs;

        Map<String, EtfPreferenceRequest.EtfItem> customBySymbol = new HashMap<>();
        for (EtfPreferenceRequest.EtfItem item : customEtfs) {
            if (item == null || item.symbol == null || item.symbol.isBlank()) {
                continue;
            }
            String normalizedSymbol = item.symbol.trim().toUpperCase(Locale.ROOT);
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

            String name = isCustom && custom.name != null && !custom.name.isBlank()
                    ? custom.name.trim()
                    : symbol;
            BigDecimal price = isCustom && custom.price != null && custom.price > 0
                    ? BigDecimal.valueOf(custom.price)
                    : BigDecimal.ZERO;
            BigDecimal ter = isCustom && custom.ter != null && custom.ter >= 0
                    ? BigDecimal.valueOf(custom.ter)
                    : BigDecimal.ZERO;

            String source = isCustom && custom.source != null && !custom.source.isBlank()
                    ? custom.source.trim()
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
