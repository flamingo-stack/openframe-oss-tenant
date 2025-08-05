package com.openframe.authz.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Simple Security Configuration for Authorization Server
 * Allows OAuth endpoints without complex authorization server setup
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/oauth/**",           // OAuth endpoints
                    "/oauth2/**",          // Social OAuth endpoints  
                    "/sso/**",             // SSO providers
                    "/actuator/health",    // Health check
                    "/.well-known/**",     // OpenID configuration
                    "/error"               // Error handling
                ).permitAll()
                .anyRequest().authenticated()
            )
            .build();
    }
}