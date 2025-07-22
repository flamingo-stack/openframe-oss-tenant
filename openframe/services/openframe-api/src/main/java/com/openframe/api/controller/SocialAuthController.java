package com.openframe.api.controller;

import com.openframe.api.dto.oauth.SocialAuthRequest;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.service.SocialAuthService;
import com.openframe.security.jwt.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/oauth2")
@RequiredArgsConstructor
public class SocialAuthController {
    private final SocialAuthService socialAuthService;
    private final JwtService jwtService;

    @PostMapping(value = "/{provider}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> authenticate(
            @PathVariable String provider,
            @RequestBody SocialAuthRequest request,
            HttpServletResponse httpResponse) {
        log.debug("Social authentication request - provider: {}", provider);
        TokenResponse response = socialAuthService.authenticate(provider, request);

        jwtService.setAccessTokenCookie(httpResponse, response.getAccessToken());

        jwtService.setRefreshTokenCookie(httpResponse, response.getRefreshToken());

        return ResponseEntity.ok(Map.of(
                "token_type", response.getTokenType(),
                "expires_in", response.getExpiresIn(),
                "message", "Social authentication successful - tokens set as secure cookies",
                "provider", provider
        ));
    }
} 