package com.openframe.api.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationProvider;
import org.springframework.security.oauth2.server.resource.authentication.JwtIssuerAuthenticationManagerResolver;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security configuration for OpenFrame API service.
 * 
 * Minimal configuration since Gateway already handles authentication/authorization.
 * This config only enables OAuth2 Resource Server for @AuthenticationPrincipal support.
 * 
 * Gateway is responsible for:
 * - JWT validation and filtering
 * - PermitAll path handling  
 * - Adding Authorization headers from cookies
 */
@Configuration
@EnableWebSecurity
@Slf4j
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtIssuerAuthenticationManagerResolver issuerResolver = new JwtIssuerAuthenticationManagerResolver(
            issuer -> {
                log.info("Creating JwtDecoder for issuer: {}", issuer);
                var decoder = JwtDecoders.fromIssuerLocation(issuer);
                JwtAuthenticationProvider provider = new JwtAuthenticationProvider(decoder);
                return provider::authenticate;
            }
        );
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.authenticationManagerResolver(issuerResolver))
                .build();
    }
} 