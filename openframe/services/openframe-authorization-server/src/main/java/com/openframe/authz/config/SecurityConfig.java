package com.openframe.authz.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Security Configuration for Default Requests
 * This handles all non-Authorization Server requests
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    @Order(2)
    public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http,
                                                          CorsConfigurationSource corsConfigurationSource) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // Allow CORS preflight
                .requestMatchers(
                    "/oauth/**",           // OAuth endpoints
                    "/oauth2/**",          // Social OAuth endpoints
                    "/login",              // Login page
                    "/favicon.ico",        // Favicon
                    "/tenant/**",          // Tenant discovery endpoints
                    "/sso/**",             // SSO providers
                    "/actuator/health",    // Health check
                    "/.well-known/**",     // OpenID configuration
                    "/error"               // Error handling
                ).permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form.loginPage("/login").permitAll())
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(CorsProperties props) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(props.allowedOrigins());
        configuration.setAllowedMethods(props.allowedMethods());
        configuration.setAllowedHeaders(props.allowedHeaders());
        configuration.setAllowCredentials(props.allowCredentials());
        configuration.setMaxAge(props.maxAge());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}