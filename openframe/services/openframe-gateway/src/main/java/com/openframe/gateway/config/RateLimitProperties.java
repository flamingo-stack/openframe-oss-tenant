package com.openframe.gateway.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "openframe.rate-limit")
public class RateLimitProperties {
    private int defaultRequestsPerMinute = 100;
    private int defaultRequestsPerHour = 1000;
} 