package com.openframe.authz.controller;

import com.openframe.authz.dto.UserRegistrationRequest;
import com.openframe.authz.dto.TokenResponse;
import com.openframe.authz.service.RegistrationService;
import com.openframe.authz.service.OAuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;

@Slf4j
@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;
    private final OAuthService oauthService;

    @PostMapping(value = "/register", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> register(
            @Valid @RequestBody UserRegistrationRequest request,
            @RequestHeader(AUTHORIZATION) String authHeader,
            HttpServletResponse httpResponse) {

        log.info("User registration attempt: {}", request.getEmail());
        
        try {
            TokenResponse response = registrationService.registerUser(request, authHeader);
            oauthService.setAuthenticationCookies(response, httpResponse);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Registration error for {}: {}", request.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of(
                "error", "registration_failed",
                "message", e.getMessage()
            ));
        }
    }
}