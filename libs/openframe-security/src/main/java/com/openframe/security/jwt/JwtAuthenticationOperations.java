package com.openframe.security.jwt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.userdetails.UserDetails;

public interface JwtAuthenticationOperations {

    Logger JWT_LOGGER = LoggerFactory.getLogger(JwtAuthenticationOperations.class);

    JwtService getJwtService();

    String getManagementPath();
    

    default boolean isPermittedPath(String path) {
        return path.startsWith("/health") ||
               path.startsWith("/metrics") ||
               path.startsWith("/actuator") ||
               path.startsWith("/oauth/token") ||
               path.startsWith("/oauth/register") ||
               path.startsWith(getManagementPath()) ||
               path.equals("/.well-known/openid-configuration");
    }

    default String extractJwt(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.substring(7);
    }

    default boolean validateToken(String jwt, UserDetails userDetails) {
        try {
            return getJwtService().isTokenValid(jwt, userDetails);
        } catch (Exception e) {
            JWT_LOGGER.error("Error validating JWT token: {}", e.getMessage(), e);
            return false;
        }
    }

    default String extractUsername(String jwt) {
        try {
            return getJwtService().extractUsername(jwt);
        } catch (Exception e) {
            JWT_LOGGER.error("Error extracting username from JWT: {}", e.getMessage(), e);
            return null;
        }
    }
} 