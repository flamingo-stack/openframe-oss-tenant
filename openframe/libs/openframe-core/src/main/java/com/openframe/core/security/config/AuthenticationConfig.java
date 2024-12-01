package com.openframe.core.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.openframe.core.security.filter.ApiKeyAuthFilter;
import com.openframe.core.security.filter.EndpointAuthFilter;
import com.openframe.core.security.interceptor.RateLimitInterceptor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class AuthenticationConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;
    private final ApiKeyAuthFilter apiKeyFilter;
    private final EndpointAuthFilter endpointFilter;
    private final Converter<Jwt, AbstractAuthenticationToken> jwtAuthConverter;

    public AuthenticationConfig(
            RateLimitInterceptor rateLimitInterceptor,
            ApiKeyAuthFilter apiKeyFilter,
            EndpointAuthFilter endpointFilter,
            Converter<Jwt, AbstractAuthenticationToken> jwtAuthConverter) {
        this.rateLimitInterceptor = rateLimitInterceptor;
        this.apiKeyFilter = apiKeyFilter;
        this.endpointFilter = endpointFilter;
        this.jwtAuthConverter = jwtAuthConverter;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
            .addPathPatterns("/api/v1/integration/**");
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/**", "/health", "/logging/**", "/oauth2/**", "/login/**").permitAll()
                .requestMatchers("/ws/v1/data/**").hasRole("ENDPOINT")
                .requestMatchers("/api/v1/dashboard/**").hasRole("USER")
                .requestMatchers("/api/v1/integration/**").hasRole("API")
                .anyRequest().authenticated())
            .addFilterBefore(apiKeyFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(endpointFilter, ApiKeyAuthFilter.class)
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter)))
            .oauth2Login(oauth2 -> oauth2
                .defaultSuccessUrl("/api/v1/dashboard")
                .failureUrl("/login?error=true"));
        
        return http.build();
    }
} 