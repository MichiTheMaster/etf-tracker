package com.etftracker.backend.repository;

import com.etftracker.backend.entity.Portfolio;
import com.etftracker.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    Optional<Portfolio> findByUserAndName(User user, String name);

    Optional<Portfolio> findFirstByUser(User user);
}
