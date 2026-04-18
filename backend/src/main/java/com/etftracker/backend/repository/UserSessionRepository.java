package com.etftracker.backend.repository;

import com.etftracker.backend.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, String> {

    Optional<UserSession> findByIdAndUserUsername(String id, String username);

    List<UserSession> findByUserUsernameOrderByLastSeenAtDesc(String username);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.expiresAt < :cutoff")
    int deleteByExpiresAtBefore(@Param("cutoff") Instant cutoff);
}
