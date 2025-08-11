package com.openframe.authz.controller;

import com.openframe.security.cookie.CookieService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller for handling logout and token cleanup
 */
@RestController
@RequestMapping({"/oauth"})
@RequiredArgsConstructor
@Slf4j
public class LogoutController {

    private final CookieService cookieService;

    /**
     * Logout endpoint - clears all authentication cookies
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        try {
            log.info("Processing logout request");

            cookieService.clearTokenCookies(response);
            
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Logged out successfully"
            ));
            
        } catch (Exception e) {
            log.error("Error during logout: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "status", "error",
                "message", "Logout failed"
            ));
        }
    }
}
