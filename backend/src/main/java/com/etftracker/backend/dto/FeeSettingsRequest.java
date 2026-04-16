package com.etftracker.backend.dto;

import java.math.BigDecimal;

public class FeeSettingsRequest {
    public BigDecimal transactionFeeRate;
    public BigDecimal depotFeeRate;

    public FeeSettingsRequest() {
    }
}
