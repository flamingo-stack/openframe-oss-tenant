package com.openframe.authz.controller;

import com.openframe.authz.dto.SocialAuthRequest;
import com.openframe.authz.dto.TokenResponse;
import com.openframe.authz.service.OAuthService;
import com.openframe.authz.service.SocialAuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Social authentication controller
 * Handles Google, Microsoft, and other OAuth2 providers
 */
@Slf4j
@RestController
@RequestMapping("/oauth2")
@RequiredArgsConstructor
public class SocialAuthController {
    private final SocialAuthService socialAuthService;
    private final OAuthService oauthService;

    @PostMapping(value = "/{provider}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> authenticate(
            @PathVariable String provider,
            @RequestBody SocialAuthRequest request,
            HttpServletResponse httpResponse) {
        log.debug("Social authentication request - provider: {}", provider);
        TokenResponse response = socialAuthService.authenticate(provider, request);

        oauthService.setAuthenticationCookies(response, httpResponse);

        return ResponseEntity.ok(Map.of(
                "token_type", response.getTokenType(),
                "expires_in", response.getExpiresIn(),
                "message", "Social authentication successful - tokens set as secure cookies",
                "provider", provider,
                "tenant_id", response.getTenantId(),
                "tenant_domain", response.getTenantDomain()
        ));
    }
}