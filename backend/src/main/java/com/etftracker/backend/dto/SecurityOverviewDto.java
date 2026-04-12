package com.etftracker.backend.dto;

import java.util.List;
import java.util.Map;

public class SecurityOverviewDto {
    private long failedLoginsLast24Hours;
    private long failedLoginsLast7Days;
    private List<LockedAccountDto> lockedAccounts;
    private List<SecurityIncidentDto> unusualActivities;
    private Map<String, Long> failedLoginsByUsername;

    public SecurityOverviewDto(long failedLoginsLast24Hours, long failedLoginsLast7Days,
            List<LockedAccountDto> lockedAccounts, List<SecurityIncidentDto> unusualActivities,
            Map<String, Long> failedLoginsByUsername) {
        this.failedLoginsLast24Hours = failedLoginsLast24Hours;
        this.failedLoginsLast7Days = failedLoginsLast7Days;
        this.lockedAccounts = lockedAccounts;
        this.unusualActivities = unusualActivities;
        this.failedLoginsByUsername = failedLoginsByUsername;
    }

    public long getFailedLoginsLast24Hours() {
        return failedLoginsLast24Hours;
    }

    public long getFailedLoginsLast7Days() {
        return failedLoginsLast7Days;
    }

    public List<LockedAccountDto> getLockedAccounts() {
        return lockedAccounts;
    }

    public List<SecurityIncidentDto> getUnusualActivities() {
        return unusualActivities;
    }

    public Map<String, Long> getFailedLoginsByUsername() {
        return failedLoginsByUsername;
    }
}
