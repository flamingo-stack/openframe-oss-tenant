package com.openframe.api.config;

import com.openframe.security.authentication.AuthPrincipalArgumentResolver;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Configuration for custom authentication argument resolvers.
 * Registers AuthPrincipalArgumentResolver to support @AuthenticationPrincipal AuthPrincipal.
 */
@Configuration
public class AuthenticationConfig implements WebMvcConfigurer {

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new AuthPrincipalArgumentResolver());
    }
} 