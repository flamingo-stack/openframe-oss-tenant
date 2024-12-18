package com.openframe.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.openframe.security.config.BaseSecurityConfig;
import com.openframe.security.jwt.JwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;


@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig extends BaseSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;

    @Override
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return configureBaseHttpSecurity(http)
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
