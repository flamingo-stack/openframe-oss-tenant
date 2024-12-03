package com.openframe.api.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;

import com.openframe.api.service.JwtService;

@TestConfiguration
@ActiveProfiles("test")
public class TestConfig {

    @Bean
    @Primary
    public JwtService jwtService() {
        return new JwtService();
    }

    // Add other test-specific beans if needed
}
