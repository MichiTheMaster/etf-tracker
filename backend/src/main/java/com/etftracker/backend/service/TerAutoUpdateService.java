package com.etftracker.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TerAutoUpdateService {

    private static final Logger log = LoggerFactory.getLogger(TerAutoUpdateService.class);

    public TerAutoUpdateService() {
        log.info("TER auto-update disabled: values come only from the local fallback file.");
    }
}
