package com.openframe.security.jwt;

import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ServerWebExchange;

import jakarta.servlet.http.HttpServletRequest;

public interface JwtAuthenticationOperations {

    String AUTHORIZATION_QUERY_PARAM = "authorization";

    Logger JWT_LOGGER = LoggerFactory.getLogger(JwtAuthenticationOperations.class);

    JwtService getJwtService();

    String getManagementPath();

    default String getRequestAuthToken(Object request) {
        if (request instanceof HttpServletRequest httpRequest) {
            String authorisationHeader = httpRequest.getHeader(HttpHeaders.AUTHORIZATION);
            if (authorisationHeader != null) {
                return authorisationHeader;
            }
            return httpRequest.getParameter(AUTHORIZATION_QUERY_PARAM);
        } else if (request instanceof ServerWebExchange serverWebExchange) {
            ServerHttpRequest httpRequest = serverWebExchange.getRequest();
            String authorisationHeader = httpRequest.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authorisationHeader != null) {
                return authorisationHeader;
            }
            return httpRequest.getQueryParams().getFirst(AUTHORIZATION_QUERY_PARAM);
        }
        return null;
    }

    default String getOrigin(Object request) {
        if (request instanceof HttpServletRequest) {
            return ((HttpServletRequest) request).getHeader("Origin");
        } else if (request instanceof ServerWebExchange) {
            return ((ServerWebExchange) request).getRequest()
                    .getHeaders().getFirst("Origin");
        }
        return null;
    }

    default String getPath(Object request) {
        if (request instanceof HttpServletRequest) {
            return ((HttpServletRequest) request).getRequestURI();
        } else if (request instanceof ServerWebExchange) {
            return ((ServerWebExchange) request).getRequest()
                    .getPath().value();
        }
        return null;
    }

    default String getMethod(Object request) {
        if (request instanceof HttpServletRequest) {
            return ((HttpServletRequest) request).getMethod();
        } else if (request instanceof ServerWebExchange) {
            return ((ServerWebExchange) request).getRequest()
                    .getMethod().name();
        }
        return null;
    }

    default boolean isPermittedPath(String path, String method) {
        // Skip JWT check for OPTIONS requests (CORS preflight)
        if ("OPTIONS".equals(method)) {
            JWT_LOGGER.debug("Skipping JWT filter for OPTIONS request");
            return true;
        }

        // Skip JWT check for permitted paths
        if (isPathPermitted(path)) {
            JWT_LOGGER.debug("Skipping JWT filter for permitted path: {}", path);
            return true;
        }

        return false;
    }

    default boolean isPathPermitted(String path) {
        return path.startsWith("/health")
                || path.startsWith("/metrics")
                || path.startsWith("/actuator")
                || path.startsWith("/oauth/token")
                || path.startsWith("/oauth/register")
                || path.startsWith("/api/agents/register")
                || path.startsWith(getManagementPath())
                || path.equals("/.well-known/openid-configuration");
    }

    default String extractJwt(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            JWT_LOGGER.debug("No valid auth header found");
            return null;
        }
        return authHeader.substring(7);
    }

    default String extractUsername(String jwt) {
        try {
            String username = getJwtService().extractUsername(jwt);
            if (username == null) {
                JWT_LOGGER.warn("No username found in token");
            } else {
                JWT_LOGGER.debug("Extracted username from token: {}", username);
            }
            return username;
        } catch (Exception e) {
            JWT_LOGGER.error("Error extracting username from JWT: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            return null;
        }
    }

    default boolean validateToken(String jwt, UserDetails userDetails) {
        try {
            Jwt decodedJwt = getJwtService().decodeToken(jwt);
            Instant expirationTime = decodedJwt.getExpiresAt();
            Instant now = Instant.now();
            Duration timeUntilExpiration = Duration.between(now, expirationTime);

            JWT_LOGGER.info("Token expiration status - Expires at: {}, Current time: {}, Time until expiration: {} seconds",
                    expirationTime,
                    now,
                    timeUntilExpiration.getSeconds());

            boolean isValid = getJwtService().isTokenValid(jwt, userDetails);
            if (!isValid) {
                JWT_LOGGER.warn("Token validation failed for user: {}", userDetails.getUsername());
            }
            return isValid;
        } catch (Exception e) {
            JWT_LOGGER.error("Error validating JWT token: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            return false;
        }
    }

    default void logAuthAttempt(String method, String path, String authHeader) {
        JWT_LOGGER.info("Processing request: {} {} with auth: {}",
                method,
                path,
                authHeader != null ? "Bearer token present" : "no auth");
    }
}
