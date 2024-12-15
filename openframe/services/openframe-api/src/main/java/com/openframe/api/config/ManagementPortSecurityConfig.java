package com.openframe.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@Order(0)
public class ManagementPortSecurityConfig {

    @Value("${management.server.port}")
    private int managementPort;

    @Value("${management.server.base-path:/management}")
    private String managementBasePath;

    @Bean
    public SecurityFilterChain managementPortSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher(request -> 
                request.getServerPort() == managementPort || 
                request.getRequestURI().startsWith(managementBasePath + "/"))
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()
            )
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .anonymous(Customizer.withDefaults());

        return http.build();
    }
} 