package com.etftracker.backend.repository;

import com.etftracker.backend.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, String> {

    Optional<UserSession> findByIdAndUserUsername(String id, String username);

    List<UserSession> findByUserUsernameOrderByLastSeenAtDesc(String username);
}
