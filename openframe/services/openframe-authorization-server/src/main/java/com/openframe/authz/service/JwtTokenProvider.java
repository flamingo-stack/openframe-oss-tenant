package com.openframe.authz.service;

import com.openframe.authz.document.User;
import com.openframe.security.jwt.JwtConfig;
import com.openframe.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * JWT Token Provider for Authorization Server
 * Handles generation and validation of access and refresh tokens
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JwtTokenProvider {

    private final JwtService jwtService;
    private final JwtConfig jwtConfig;

    @Value("${openframe.security.jwt.access-token-expiration:900}")
    private int accessTokenExpirationSeconds;

    @Value("${openframe.security.jwt.refresh-token-expiration:604800}")
    private int refreshTokenExpirationSeconds;

    /**
     * Generate access token for user
     */
    public String generateAccessToken(User user, String clientId) {
        Instant now = Instant.now();
        Instant expiry = now.plus(accessTokenExpirationSeconds, ChronoUnit.SECONDS);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(jwtConfig.getIssuer())
                .subject(user.getId())
                .audience(List.of(jwtConfig.getAudience()))
                .issuedAt(now)
                .expiresAt(expiry)
                .claim("email", user.getEmail())
                .claim("given_name", user.getFirstName())
                .claim("family_name", user.getLastName())
                .claim("name", user.getFullName())
                .claim("tenant_id", user.getTenantId())
                .claim("tenant_domain", user.getTenantDomain())
                .claim("roles", user.getRoles())
                .claim("client_id", clientId)
                .claim("scope", "openid profile email openframe.read openframe.write")
                .claim("authorities", user.getRoles().stream()
                        .map(role -> "ROLE_" + role)
                        .toList())
                .build();

        return jwtService.generateToken(claims);
    }

    /**
     * Generate refresh token for user
     */
    public String generateRefreshToken(String userId, String clientId) {
        Instant now = Instant.now();
        Instant expiry = now.plus(refreshTokenExpirationSeconds, ChronoUnit.SECONDS);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(jwtConfig.getIssuer())
                .subject(userId)
                .audience(List.of(jwtConfig.getAudience()))
                .issuedAt(now)
                .expiresAt(expiry)
                .claim("client_id", clientId)
                .claim("token_type", "refresh")
                .build();

        return jwtService.generateToken(claims);
    }

    /**
     * Extract user ID from refresh token
     */
    public String extractUserIdFromRefreshToken(String refreshToken) {
        try {
            Jwt jwt = jwtService.decodeToken(refreshToken);
            
            // Validate that it's a refresh token
            String tokenType = jwt.getClaimAsString("token_type");
            if (!"refresh".equals(tokenType)) {
                throw new IllegalArgumentException("Not a refresh token");
            }
            
            return jwt.getSubject();
        } catch (Exception e) {
            log.error("Error extracting user ID from refresh token: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid refresh token", e);
        }
    }

    /**
     * Validate and decode token
     */
    public Jwt validateToken(String token) {
        try {
            return jwtService.decodeToken(token);
        } catch (Exception e) {
            log.error("Token validation failed: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid token", e);
        }
    }
}