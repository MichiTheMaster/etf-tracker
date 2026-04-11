package com.etftracker.backend.config;

import com.etftracker.backend.entity.Role;
import com.etftracker.backend.repository.RoleRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;

    public DataInitializer(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public void run(String... args) {

        if (roleRepository.findByName("USER").isEmpty()) {
            roleRepository.save(new Role("USER"));
            System.out.println("✔ Rolle USER angelegt");
        }

        if (roleRepository.findByName("ADMIN").isEmpty()) {
            roleRepository.save(new Role("ADMIN"));
            System.out.println("✔ Rolle ADMIN angelegt");
        }
    }
}
