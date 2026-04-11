package com.etftracker.backend.repository;

import com.etftracker.backend.entity.User;
import com.etftracker.backend.entity.UserEtfSelection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserEtfSelectionRepository extends JpaRepository<UserEtfSelection, Long> {
    List<UserEtfSelection> findByUser(User user);

    void deleteByUser(User user);
}
