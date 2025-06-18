package com.openframe.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SSOConfigStatusResponse {
    private boolean enabled;
    private String provider;
    private String clientId;
} 