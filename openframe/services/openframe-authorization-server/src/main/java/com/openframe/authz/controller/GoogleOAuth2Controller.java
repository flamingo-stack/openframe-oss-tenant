package com.openframe.authz.controller;

import com.openframe.authz.config.GoogleSSOProperties;
import com.openframe.authz.document.SSOConfig;
import com.openframe.authz.document.User;
import com.openframe.authz.service.SSOConfigService;
import com.openframe.authz.service.UserService;
import com.openframe.authz.service.TenantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.Optional;

/**
 * Controller for handling Google OAuth2 integration
 * Provides endpoints for Google SSO authorization and token exchange
 */
@Slf4j
@RestController
@RequestMapping("/oauth2/google")
@RequiredArgsConstructor
public class GoogleOAuth2Controller {

    private final SSOConfigService ssoConfigService;
    private final GoogleSSOProperties googleSSOProperties;
    private final UserService userService;
    private final TenantService tenantService;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Generate Google OAuth2 authorization URL for specific tenant
     */
    @GetMapping("/authorize/{tenantId}")
    public ResponseEntity<?> getGoogleAuthUrl(@PathVariable String tenantId,
                                             @RequestParam(required = false) String state) {
        try {
            // Check if Google SSO is configured for this tenant
            Optional<SSOConfig> googleConfig = ssoConfigService.getSSOConfig(tenantId, "google");
            
            if (googleConfig.isEmpty() || !googleConfig.get().isActive()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "google_sso_not_configured", 
                               "message", "Google SSO is not configured for this tenant"));
            }

            SSOConfig config = googleConfig.get();
            
            // Build Google authorization URL
            String authUrl = UriComponentsBuilder
                .fromUriString(googleSSOProperties.getAuthorizationUrl())
                .queryParam("client_id", config.getClientId())
                .queryParam("redirect_uri", googleSSOProperties.getRedirectUri())
                .queryParam("scope", googleSSOProperties.getScopes())
                .queryParam("response_type", "code")
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("state", state != null ? state : tenantId)
                .build()
                .toUriString();

            return ResponseEntity.ok(Map.of("authUrl", authUrl));

        } catch (Exception e) {
            log.error("Error generating Google auth URL for tenant {}: {}", tenantId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "internal_error", 
                           "message", "Failed to generate Google authorization URL"));
        }
    }

    /**
     * Handle Google OAuth2 callback and token exchange
     */
    @PostMapping("/callback")
    public ResponseEntity<?> handleGoogleCallback(@RequestParam String code,
                                                 @RequestParam(required = false) String state,
                                                 @RequestParam String tenantId) {
        try {
            // Get Google SSO config for tenant
            Optional<SSOConfig> googleConfig = ssoConfigService.getSSOConfig(tenantId, "google");
            
            if (googleConfig.isEmpty() || !googleConfig.get().isActive()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "google_sso_not_configured"));
            }

            SSOConfig config = googleConfig.get();
            String clientSecret = ssoConfigService.getDecryptedClientSecret(config);

            // Exchange code for access token
            Map<String, String> tokenRequest = Map.of(
                "client_id", config.getClientId(),
                "client_secret", clientSecret,
                "code", code,
                "grant_type", "authorization_code",
                "redirect_uri", googleSSOProperties.getRedirectUri()
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> tokenResponse = restTemplate.postForObject(
                googleSSOProperties.getTokenUrl(),
                tokenRequest,
                Map.class
            );

            if (tokenResponse == null || !tokenResponse.containsKey("access_token")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "token_exchange_failed"));
            }

            String accessToken = (String) tokenResponse.get("access_token");

            // Get user info from Google
            Map<String, Object> userInfo = getUserInfoFromGoogle(accessToken);
            
            if (userInfo == null || !userInfo.containsKey("email")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "userinfo_failed"));
            }

            String email = (String) userInfo.get("email");
            String firstName = (String) userInfo.get("given_name");
            String lastName = (String) userInfo.get("family_name");

            // Find or create user
            Optional<User> existingUser = userService.findByEmailAndTenantId(email, tenantId);
            
            User user;
            if (existingUser.isPresent()) {
                user = existingUser.get();
                log.info("Google SSO login for existing user: {} in tenant: {}", email, tenantId);
            } else {
                // Create new user from Google SSO
                user = userService.createUserFromSSO(email, firstName, lastName, tenantId, "google");
                log.info("Created new user from Google SSO: {} in tenant: {}", email, tenantId);
            }

            // Generate OpenFrame tokens (this should integrate with Spring Authorization Server)
            // For now, return success with user info
            return ResponseEntity.ok(Map.of(
                "success", true,
                "user", Map.of(
                    "id", user.getId(),
                    "email", user.getEmail(),
                    "firstName", user.getFirstName(),
                    "lastName", user.getLastName(),
                    "tenantId", user.getTenantId()
                )
            ));

        } catch (Exception e) {
            log.error("Error handling Google callback for tenant {}: {}", tenantId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "internal_error", 
                           "message", "Failed to process Google OAuth callback"));
        }
    }

    /**
     * Get user information from Google using access token
     */
    private Map<String, Object> getUserInfoFromGoogle(String accessToken) {
        try {
            String userInfoUrl = googleSSOProperties.getUserinfoUrl() + "?access_token=" + accessToken;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> userInfo = restTemplate.getForObject(userInfoUrl, Map.class);
            
            log.debug("Google user info retrieved successfully");
            return userInfo;
            
        } catch (Exception e) {
            log.error("Error getting user info from Google: {}", e.getMessage());
            return null;
        }
    }
}
