package com.openframe.authz.controller;

import com.openframe.authz.dto.UserRegistrationRequest;
import com.openframe.authz.dto.TokenResponse;
import com.openframe.authz.service.OAuthService;
import com.openframe.authz.service.RegistrationService;
import com.openframe.security.authentication.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import static com.openframe.core.constants.HttpHeaders.AUTHORIZATION;
import static com.openframe.core.constants.HttpHeaders.X_REFRESH_TOKEN;

/**
 * OAuth2 endpoints for token management
 * Provides standard OAuth2 endpoints that work with cookie-based authentication
 */
@Slf4j
@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oauthService;
    private final RegistrationService registrationService;

    /**
     * OAuth2 token endpoint
     * Supports multiple grant types: password, authorization_code, refresh_token
     */
    @PostMapping(value = "/token", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> token(
            @RequestParam String grant_type,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String password,
            @RequestParam String client_id,
            @RequestParam(required = false) String client_secret,
            @RequestHeader(value = X_REFRESH_TOKEN, required = false) String refreshToken,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        log.debug("Token request - grant_type: {}, client_id: {}", grant_type, client_id);

        try {
            TokenResponse tokenResponse = oauthService.processTokenRequest(
                    grant_type, code, username, password, client_id, client_secret, refreshToken, httpRequest);

            oauthService.setAuthenticationCookies(tokenResponse, httpResponse);

            return ResponseEntity.ok(tokenResponse);
        } catch (Exception e) {
            log.error("Token error: {}", e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of(
                    "error", "invalid_request",
                    "error_description", e.getMessage()
            ));
        }
    }

    /**
     * User registration endpoint
     * Creates new user and returns authentication tokens
     */
    @PostMapping(value = "/register", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> register(
            @RequestBody UserRegistrationRequest userRequest,
            @RequestHeader(AUTHORIZATION) String authHeader,
            HttpServletResponse httpResponse) {

        log.info("User registration: {}", userRequest.getEmail());
        try {
            TokenResponse tokenResponse = registrationService.registerUser(userRequest, authHeader);
            oauthService.setAuthenticationCookies(tokenResponse, httpResponse);

            return ResponseEntity.ok(tokenResponse);
        } catch (Exception e) {
            log.error("Registration error: {}", e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of(
                    "error", "invalid_request",
                    "error_description", e.getMessage(),
                    "email", userRequest.getEmail()
            ));
        }
    }

    /**
     * Get current user information
     * Returns user details from JWT token
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal AuthPrincipal principal) {
        log.debug("Getting current user info for: {}", principal.getId());

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", Map.of(
                        "id", principal.getId(),
                        "email", principal.getEmail(),
                        "displayName", principal.getDisplayName(),
                        "roles", principal.getRoles(),
                        "tenantId", "default" // TODO: get from user context
                )
        ));
    }

    /**
     * Logout endpoint
     * Clears authentication cookies
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse httpResponse) {
        log.debug("Logout request");

        oauthService.clearAuthenticationCookies(httpResponse);

        return ResponseEntity.ok(Map.of(
                "message", "Successfully logged out",
                "status", "success"
        ));
    }
}