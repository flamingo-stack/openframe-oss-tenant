package com.openframe.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SSOConfigResponse {
    private String id;
    private String provider;
    private String clientId;
    private String clientSecret;
    private boolean enabled;
} 