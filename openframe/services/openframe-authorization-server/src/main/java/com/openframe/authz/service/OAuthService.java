package com.openframe.authz.service;

import com.openframe.authz.document.User;
import com.openframe.authz.dto.TokenResponse;
import com.openframe.security.cookie.CookieService;
import com.openframe.authz.service.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * OAuth2 service for token management and authentication
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthService {

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final CookieService cookieService;
    private final PasswordEncoder passwordEncoder;

    @Value("${openframe.security.jwt.access-token-expiration:900}")
    private int accessTokenExpirationSeconds;

    @Value("${openframe.security.jwt.refresh-token-expiration:604800}")
    private int refreshTokenExpirationSeconds;

    /**
     * Process different OAuth2 grant types
     */
    public TokenResponse processTokenRequest(String grantType, String code, String username, 
                                           String password, String clientId, String clientSecret,
                                           String refreshToken, HttpServletRequest request) {
        
        log.debug("Processing token request: grant_type={}, client_id={}", grantType, clientId);
        
        // TODO: Add client validation
        if (!"openframe-ui".equals(clientId) && !"openframe-external-api".equals(clientId)) {
            throw new IllegalArgumentException("Invalid client_id");
        }

        switch (grantType) {
            case "password":
                return handlePasswordGrant(username, password, clientId);
            case "refresh_token":
                return handleRefreshTokenGrant(refreshToken, clientId);
            case "authorization_code":
                // TODO: Implement authorization code grant
                throw new UnsupportedOperationException("Authorization code grant not yet implemented");
            default:
                throw new IllegalArgumentException("Unsupported grant type: " + grantType);
        }
    }

    /**
     * Handle password grant (Resource Owner Password Credentials)
     */
    private TokenResponse handlePasswordGrant(String username, String password, String clientId) {
        if (username == null || password == null) {
            throw new IllegalArgumentException("Username and password are required");
        }

        User user = userService.findByEmail(username);
        if (user == null) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        if (!user.isActive()) {
            throw new IllegalArgumentException("Account is disabled");
        }

        // Update last login
        userService.updateLastLogin(user.getId());

        return generateTokens(user, clientId, "password");
    }

    /**
     * Handle refresh token grant
     */
    private TokenResponse handleRefreshTokenGrant(String refreshToken, String clientId) {
        if (refreshToken == null) {
            throw new IllegalArgumentException("Refresh token is required");
        }

        try {
            // Validate and extract user ID from refresh token
            String userId = jwtTokenProvider.extractUserIdFromRefreshToken(refreshToken);
            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            if (!user.isActive()) {
                throw new IllegalArgumentException("Account is disabled");
            }

            return generateTokens(user, clientId, "refresh_token");

        } catch (Exception e) {
            log.error("Invalid refresh token: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid refresh token");
        }
    }

    /**
     * Generate access and refresh tokens for user
     */
    public TokenResponse generateTokens(User user, String clientId, String grantType) {
        try {
            String accessToken = jwtTokenProvider.generateAccessToken(user, clientId);
            String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), clientId);

            return TokenResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .expiresIn(accessTokenExpirationSeconds)
                    .scope("openid profile email openframe.read openframe.write")
                    .tenantId(user.getTenantId())
                    .tenantDomain(user.getTenantDomain())
                    .build();

        } catch (Exception e) {
            log.error("Error generating tokens for user {}: {}", user.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to generate tokens", e);
        }
    }

    /**
     * Set authentication cookies in response
     */
    public void setAuthenticationCookies(TokenResponse tokenResponse, HttpServletResponse response) {
        cookieService.setAccessTokenCookie(response, tokenResponse.getAccessToken());
        cookieService.setRefreshTokenCookie(response, tokenResponse.getRefreshToken());
        
        log.debug("Set authentication cookies for token response");
    }

    /**
     * Clear authentication cookies
     */
    public void clearAuthenticationCookies(HttpServletResponse response) {
        cookieService.clearTokenCookies(response);
        
        log.debug("Cleared authentication cookies");
    }
}