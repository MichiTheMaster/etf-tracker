package com.etftracker.backend.service;

import com.etftracker.backend.dto.PortfolioResponse;
import com.etftracker.backend.dto.PortfolioResponse.HoldingDTO;
import com.etftracker.backend.dto.PortfolioResponse.TransactionDTO;
import com.etftracker.backend.entity.Portfolio;
import com.etftracker.backend.entity.Position;
import com.etftracker.backend.entity.Transaction;
import com.etftracker.backend.entity.Transaction.TransactionType;
import com.etftracker.backend.entity.User;
import com.etftracker.backend.repository.PortfolioRepository;
import com.etftracker.backend.repository.PositionRepository;
import com.etftracker.backend.repository.TransactionRepository;
import com.etftracker.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final PositionRepository positionRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public PortfolioService(PortfolioRepository portfolioRepository,
            PositionRepository positionRepository,
            TransactionRepository transactionRepository,
            UserRepository userRepository) {
        this.portfolioRepository = portfolioRepository;
        this.positionRepository = positionRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Portfolio getOrCreateDefaultPortfolio(User user) {
        Optional<Portfolio> existing = portfolioRepository.findFirstByUser(user);
        if (existing.isPresent()) {
            return existing.get();
        }

        Portfolio portfolio = new Portfolio(user, "Simulator", new BigDecimal("10000.00"));
        return portfolioRepository.save(portfolio);
    }

    @Transactional
    public PortfolioResponse getPortfolioState(User user) {
        Portfolio portfolio = getOrCreateDefaultPortfolio(user);

        Map<String, HoldingDTO> holdings = new HashMap<>();
        for (Position pos : portfolio.getPositions()) {
            holdings.put(
                    pos.getSymbol(),
                    new HoldingDTO(
                            pos.getShares(),
                            pos.getCostTotal(),
                            pos.getCreatedAt() == null ? null
                                    : pos.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME)));
        }

        var transactions = transactionRepository.findByPortfolioOrderByTransactionTimestampDesc(portfolio);
        var transactionDTOs = transactions.stream()
                .map(tx -> new TransactionDTO(
                        tx.getId(),
                        tx.getType().name(),
                        tx.getSymbol(),
                        tx.getQuantity(),
                        tx.getPrice(),
                        tx.getTotal(),
                        tx.getRealizedProfit(),
                        tx.getTransactionTimestamp().format(DateTimeFormatter.ISO_DATE_TIME)))
                .toList();

        return new PortfolioResponse(portfolio.getCash(), holdings, transactionDTOs);
    }

    @Transactional
    public PortfolioResponse buyEtf(User user, String symbol, Integer quantity, BigDecimal price) {
        if (!isValidQuantity(quantity)) {
            throw new IllegalArgumentException("Ungültige Anzahl.");
        }
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Ungültiger Preis.");
        }

        Portfolio portfolio = getOrCreateDefaultPortfolio(user);

        BigDecimal total = BigDecimal.valueOf(quantity).multiply(price).setScale(2, RoundingMode.HALF_UP);

        if (portfolio.getCash().compareTo(total) < 0) {
            throw new IllegalArgumentException("Nicht genug Spielgeld vorhanden.");
        }

        portfolio.setCash(portfolio.getCash().subtract(total));

        Optional<Position> existing = positionRepository.findByPortfolioAndSymbol(portfolio, symbol);
        Position position;
        if (existing.isPresent()) {
            position = existing.get();
            BigDecimal newCostTotal = position.getCostTotal().add(total);
            position.setShares(position.getShares() + quantity);
            position.setCostTotal(newCostTotal);
        } else {
            position = new Position(portfolio, symbol, quantity, total);
            portfolio.getPositions().add(position);
        }

        positionRepository.save(position);
        portfolio = portfolioRepository.save(portfolio);

        Transaction tx = new Transaction(
                portfolio,
                TransactionType.BUY,
                symbol,
                quantity,
                price,
                total,
                LocalDateTime.now());
        transactionRepository.save(tx);

        return getPortfolioState(user);
    }

    @Transactional
    public PortfolioResponse sellEtf(User user, String symbol, Integer quantity, BigDecimal price) {
        if (!isValidQuantity(quantity)) {
            throw new IllegalArgumentException("Ungültige Anzahl.");
        }
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Ungültiger Preis.");
        }

        Portfolio portfolio = getOrCreateDefaultPortfolio(user);

        Position position = positionRepository.findByPortfolioAndSymbol(portfolio, symbol)
                .orElseThrow(() -> new IllegalArgumentException("Position nicht gefunden."));

        if (position.getShares() < quantity) {
            throw new IllegalArgumentException("Nicht genug Anteile zum Verkaufen.");
        }

        BigDecimal proceeds = BigDecimal.valueOf(quantity).multiply(price).setScale(2, RoundingMode.HALF_UP);
        BigDecimal averageCost = position.getCostTotal()
                .divide(BigDecimal.valueOf(position.getShares()), 10, RoundingMode.HALF_UP);
        BigDecimal costPart = averageCost.multiply(BigDecimal.valueOf(quantity))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal realizedProfit = proceeds.subtract(costPart);

        int remainingShares = position.getShares() - quantity;
        if (remainingShares == 0) {
            positionRepository.delete(position);
        } else {
            BigDecimal newCostTotal = position.getCostTotal().subtract(costPart)
                    .setScale(2, RoundingMode.HALF_UP);
            position.setShares(remainingShares);
            position.setCostTotal(newCostTotal);
            positionRepository.save(position);
        }

        portfolio.setCash(portfolio.getCash().add(proceeds));
        portfolio = portfolioRepository.save(portfolio);

        Transaction tx = new Transaction(
                portfolio,
                TransactionType.SELL,
                symbol,
                quantity,
                price,
                proceeds,
                LocalDateTime.now());
        tx.setRealizedProfit(realizedProfit);
        transactionRepository.save(tx);

        return getPortfolioState(user);
    }

    private boolean isValidQuantity(Integer quantity) {
        return quantity != null && quantity > 0 && quantity.equals(quantity.intValue());
    }
}
