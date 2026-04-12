package com.etftracker.backend.dto;

import com.etftracker.backend.entity.User;

public class LoginAttemptResult {
    private final User user;
    private final boolean unusualActivity;
    private final String unusualReason;
    private final String loginDetails;

    public LoginAttemptResult(User user, boolean unusualActivity, String unusualReason, String loginDetails) {
        this.user = user;
        this.unusualActivity = unusualActivity;
        this.unusualReason = unusualReason;
        this.loginDetails = loginDetails;
    }

    public User getUser() {
        return user;
    }

    public boolean isUnusualActivity() {
        return unusualActivity;
    }

    public String getUnusualReason() {
        return unusualReason;
    }

    public String getLoginDetails() {
        return loginDetails;
    }
}
