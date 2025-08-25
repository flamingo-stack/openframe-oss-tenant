package com.openframe.authz.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security Configuration for Default Requests
 * This handles all non-Authorization Server requests
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    @Order(2)
    public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                    "/oauth/**",           // OAuth endpoints
                    "/oauth2/**",          // Social OAuth endpoints
                    "/login",              // Login page
                    "/favicon.ico",        // Favicon
                    "/tenant/**",          // Tenant discovery endpoints
                    "/sso/**",             // SSO providers
                    "/management/v1/**",   // Health check
                    "/.well-known/**",     // OpenID configuration
                    "/error"               // Error handling
                ).permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form.loginPage("/login").permitAll())
            .build();
    }
}