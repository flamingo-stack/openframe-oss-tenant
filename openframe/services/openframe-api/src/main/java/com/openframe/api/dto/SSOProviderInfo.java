package com.openframe.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SSOProviderInfo {
    private String provider;
    private String displayName;
} 