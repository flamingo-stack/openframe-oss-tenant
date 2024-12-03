package com.openframe.api.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.dto.oauth.AuthorizationResponse;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.service.OAuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class OAuthController {
    
    private final OAuthService oauthService;

    @PostMapping("/authorize")
    public ResponseEntity<AuthorizationResponse> authorize(
            @RequestParam String response_type,
            @RequestParam String client_id,
            @RequestParam String redirect_uri,
            @RequestParam(required = false) String scope,
            @RequestParam(required = false) String state) {
        return ResponseEntity.ok(oauthService.authorize(
            response_type, client_id, redirect_uri, scope, state));
    }

    @PostMapping("/token")
    public ResponseEntity<TokenResponse> token(
            @RequestParam String grant_type,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String refresh_token,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String password,
            @RequestParam String client_id,
            @RequestParam String client_secret) {
        return ResponseEntity.ok(oauthService.token(
            grant_type, code, refresh_token, username, password, client_id, client_secret));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestParam String email,
            @RequestParam String password,
            @RequestParam String client_id) {
        // Validate email format
        if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        
        // Validate password strength (example: minimum 8 characters)
        if (password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }
        
        return ResponseEntity.ok(oauthService.register(email, password, client_id));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        try {
            oauthService.initiatePasswordReset(email);
        } catch (IllegalArgumentException e) {
            // Silently catch the error to prevent email enumeration
        }
        return ResponseEntity.ok(Map.of(
            "message", "If an account exists with this email, you will receive a password reset link",
            "status", "success"
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
        @RequestParam String token,
        @RequestParam String newPassword) {
        // Validate password strength
        if (newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }
        
        oauthService.resetPassword(token, newPassword);
        return ResponseEntity.ok(Map.of(
            "message", "Password has been successfully reset",
            "status", "success"
        ));
    }
} 