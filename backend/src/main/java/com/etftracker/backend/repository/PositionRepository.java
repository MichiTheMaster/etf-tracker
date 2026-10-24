package com.etftracker.backend.repository;

import com.etftracker.backend.entity.Position;
import com.etftracker.backend.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {
    Optional<Position> findByPortfolioAndSymbol(Portfolio portfolio, String symbol);

    @Query("select distinct upper(p.symbol) from Position p")
    List<String> findDistinctSymbols();
}
