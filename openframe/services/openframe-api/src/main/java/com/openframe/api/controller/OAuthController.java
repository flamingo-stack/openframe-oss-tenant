package com.openframe.api.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.openframe.api.dto.UserDTO;
import com.openframe.api.dto.oauth.AuthorizationResponse;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.service.OAuthService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

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
            @RequestParam(required = false) String refresh_token,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String password,
            @RequestParam String client_id,
            @RequestParam(required = false) String client_secret) {
        
        log.debug("Token request - grant_type: {}, client_id: {}", grant_type, client_id);
        try {
            TokenResponse response = oauthService.token(grant_type, code, refresh_token, 
                username, password, client_id, client_secret);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401)
                .body(Map.of(
                    "error", "invalid_request",
                    "error_description", e.getMessage()
                ));
        } catch (Exception e) {
            log.error("Token error: {}", e.getMessage(), e);
            return ResponseEntity.status(400)
                .body(Map.of(
                    "error", "invalid_request",
                    "error_description", "An error occurred processing the request"
                ));
        }
    }

    @PostMapping(value = "/register", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> register(@RequestBody final UserDTO userDTO, 
                                    @RequestHeader(value = "Authorization", required = true) String authHeader) {
        return oauthService.handleRegistration(userDTO, authHeader);
    }

    @PostMapping("/authorize")
    public ResponseEntity<?> authorize(
            @RequestParam("response_type") String responseType,
            @RequestParam("client_id") String clientId,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam(value = "scope", required = false) String scope,
            @RequestParam(value = "state", required = false) String state,
            @RequestHeader("X-User-Id") String userId) {
        
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
} 