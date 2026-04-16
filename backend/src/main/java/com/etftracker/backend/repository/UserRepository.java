package com.etftracker.backend.repository;

import com.etftracker.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    List<User> findByLockedUntilAfterOrderByLockedUntilAsc(Instant timestamp);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);
}