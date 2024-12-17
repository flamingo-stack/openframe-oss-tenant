package com.openframe.stream.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

import com.openframe.core.security.config.BaseSecurityConfig;


@Configuration
@EnableWebSecurity
public class SecurityConfig extends BaseSecurityConfig {
} 