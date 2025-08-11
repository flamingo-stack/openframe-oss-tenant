package com.openframe.authz.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.util.List;

@ConfigurationProperties(prefix = "cors")
public record CorsProperties(
        @DefaultValue("[]") List<String> allowedOrigins,
        @DefaultValue("[GET,POST,PUT,DELETE,OPTIONS]") List<String> allowedMethods,
        @DefaultValue("[*]") List<String> allowedHeaders,
        @DefaultValue("true") boolean allowCredentials,
        @DefaultValue("3600") long maxAge
) {
}


