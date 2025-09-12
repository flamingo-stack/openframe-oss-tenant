package com.openframe.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class ApiApplicationConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public Duration invitationTtl(Environment env) {
        long hours = env.getProperty("openframe.invitations.ttl-hours", Long.class, 24L);
        return Duration.ofHours(hours);
    }
} 