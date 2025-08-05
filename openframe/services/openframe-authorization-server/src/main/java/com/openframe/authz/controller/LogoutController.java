package com.openframe.authz.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/**
 * Logout Controller for clearing HttpOnly cookies
 * Provides logout endpoint that the frontend can call to clear authentication cookies
 */
@Slf4j
@RestController
public class LogoutController {

    /**
     * Logout endpoint that clears HttpOnly authentication cookies
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletResponse response) {
        log.info("🚪 Logout request received");

        // Clear access token cookie
        Cookie accessTokenCookie = new Cookie("access_token", "");
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(0); // Expire immediately
        accessTokenCookie.setSecure(false); // Set to true in production with HTTPS
        response.addCookie(accessTokenCookie);

        // Clear refresh token cookie
        Cookie refreshTokenCookie = new Cookie("refresh_token", "");
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setPath("/api/oauth/token"); // Match the original path for compatibility
        refreshTokenCookie.setMaxAge(0); // Expire immediately  
        refreshTokenCookie.setSecure(false); // Set to true in production with HTTPS
        response.addCookie(refreshTokenCookie);

        log.info("✅ Authentication cookies cleared successfully");
        
        return ResponseEntity.ok(Map.of(
            "message", "Logged out successfully",
            "timestamp", System.currentTimeMillis()
        ));
    }
} 