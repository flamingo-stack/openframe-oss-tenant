package com.openframe.api.controller;

import com.openframe.api.dto.UserDTO;
import com.openframe.api.dto.oauth.AuthorizationResponse;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.service.OAuthService;
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

@Slf4j
@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oauthService;

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

    @PostMapping(value = "/register", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> register(
            @RequestBody UserDTO userDTO,
            @RequestHeader(AUTHORIZATION) String authHeader,
            HttpServletResponse httpResponse) {

        log.info("User registration: {}", userDTO.getEmail());
        try {
            TokenResponse tokenResponse = oauthService.handleRegistration(userDTO, authHeader);
            oauthService.setAuthenticationCookies(tokenResponse, httpResponse);

            return ResponseEntity.ok(tokenResponse);
        } catch (Exception e) {
            log.error("Registration error: {}", e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of(
                    "error", "invalid_request",
                    "error_description", e.getMessage(),
                    "email", userDTO.getEmail()
            ));
        }
    }

    @PostMapping("/authorize")
    public ResponseEntity<?> authorize(
            @RequestParam("response_type") String responseType,
            @RequestParam("client_id") String clientId,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam(value = "scope", required = false) String scope,
            @RequestParam(value = "state", required = false) String state,
            @AuthenticationPrincipal AuthPrincipal principal) {

        log.debug("Authorization request - response_type: {}, client_id: {}, user_id: {}",
                responseType, clientId, principal.getId());

        try {
            AuthorizationResponse authResponse = oauthService.authorize(
                    responseType, clientId, redirectUri, scope, state, principal.getId());

            return ResponseEntity.ok(authResponse);
        } catch (Exception e) {
            log.error("Authorization error: {}", e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of(
                    "error", "invalid_request",
                    "error_description", e.getMessage()
            ));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal AuthPrincipal principal) {
        log.debug("Getting current user info for: {}", principal.getId());

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", Map.of(
                        "id", principal.getId(),
                        "email", principal.getEmail(),
                        "displayName", principal.getDisplayName(),
                        "roles", principal.getRoles()
                )
        ));
    }

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