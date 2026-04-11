package com.etftracker.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.etftracker.backend.entity.Role;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
}