package com.openframe.api.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class GoogleAuthConfig {
    // GoogleIdTokenVerifier тепер створюється динамічно в GoogleAuthStrategy
    // на основі конфігурації з бази даних
} 