package com.openframe.api.controller;

import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.service.SocialAuthService;
import com.openframe.core.dto.SocialAuthRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/oauth/social")
@RequiredArgsConstructor
public class SocialAuthController {
    private final SocialAuthService socialAuthService;

    @PostMapping(value = "/{provider}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TokenResponse> authenticate(
            @PathVariable String provider,
            @RequestBody SocialAuthRequest request) {
        log.debug("Social authentication request - provider: {}", provider);
        TokenResponse response = socialAuthService.authenticate(provider, request.getToken());
        return ResponseEntity.ok(response);
    }
} 