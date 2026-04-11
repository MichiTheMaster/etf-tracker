package com.etftracker.backend.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/api/me")
    public String me(Authentication auth) {
        return "Hallo " + auth.getName();
    }
}
