package com.openframe.api.controller;

import com.openframe.api.dto.UserDTO;
import com.openframe.api.dto.oauth.AuthorizationResponse;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.service.OAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import static com.openframe.core.constants.HttpHeaders.AUTHORIZATION;
import static com.openframe.core.constants.HttpHeaders.X_USER_ID;

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
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        
        log.debug("Token request - grant_type: {}, client_id: {}", grant_type, client_id);

        TokenResponse response = oauthService.processTokenRequest(grant_type, code, username, password,
                client_id, client_secret, httpRequest);

        oauthService.setAuthenticationCookies(response, httpResponse);

        return ResponseEntity.ok(Map.of(
                "token_type", response.getTokenType(),
                "expires_in", response.getExpiresIn(),
                "message", "Authentication successful - tokens set as secure cookies"
        ));
    }

    @PostMapping(value = "/register", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> register(@RequestBody final UserDTO userDTO,
                                      @RequestHeader(value = AUTHORIZATION, required = true) String authHeader,
                                      HttpServletResponse httpResponse) {

        log.debug("Registration request for email: {}", userDTO.getEmail());

        TokenResponse response = oauthService.handleRegistration(userDTO, authHeader);

        oauthService.setAuthenticationCookies(response, httpResponse);

        return ResponseEntity.ok(Map.of(
                "token_type", response.getTokenType(),
                "expires_in", response.getExpiresIn(),
                "message", "Registration successful - tokens set as secure cookies",
                "email", userDTO.getEmail()
        ));
    }

    @PostMapping("/authorize")
    public ResponseEntity<?> authorize(
            @RequestParam("response_type") String responseType,
            @RequestParam("client_id") String clientId,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam(value = "scope", required = false) String scope,
            @RequestParam(value = "state", required = false) String state,
            @RequestHeader(X_USER_ID) String userId) {
        
        log.debug("Authorization request - response_type: {}, client_id: {}, user_id: {}", responseType, clientId, userId);
        try {
            AuthorizationResponse response = oauthService.authorize(responseType, clientId, redirectUri, scope, state, userId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401)
                .body(Map.of(
                    "error", "invalid_request",
                    "error_description", e.getMessage(),
                    "state", state
                ));
        } catch (Exception e) {
            log.error("Authorization error: {}", e.getMessage(), e);
            return ResponseEntity.status(400)
                .body(Map.of(
                    "error", "invalid_request",
                    "error_description", "An error occurred processing the request",
                    "state", state
                ));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse httpResponse) {
        log.debug("Logout request");

        oauthService.clearAuthenticationCookies(httpResponse);

        return ResponseEntity.ok(Map.of(
                "message", "Logout successful"
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "message", "User is authenticated"
        ));
    }
} 