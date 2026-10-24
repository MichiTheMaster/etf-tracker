package com.etftracker.backend.repository;

import com.etftracker.backend.entity.User;
import com.etftracker.backend.entity.UserEtfSelection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface UserEtfSelectionRepository extends JpaRepository<UserEtfSelection, Long> {
    List<UserEtfSelection> findByUser(User user);

    void deleteByUser(User user);

    @Query("select distinct upper(s.symbol) from UserEtfSelection s")
    List<String> findDistinctSymbols();
}
