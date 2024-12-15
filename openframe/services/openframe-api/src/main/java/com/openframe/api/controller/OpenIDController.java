package com.openframe.api.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.dto.oidc.OpenIDConfiguration;
import com.openframe.api.dto.oidc.UserInfo;
import com.openframe.api.security.UserSecurity;
import com.openframe.api.service.OAuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/.well-known")
@RequiredArgsConstructor
public class OpenIDController {
    
    private final OAuthService oauthService;

    @GetMapping("/openid-configuration")
    public OpenIDConfiguration getConfiguration() {
        return OpenIDConfiguration.builder()
            .issuer("https://auth.openframe.com")
            .authorizationEndpoint("/oauth/authorize")
            .tokenEndpoint("/oauth/token")
            .userinfoEndpoint("/oidc/userinfo")
            .jwksUri("/.well-known/jwks.json")
            .responseTypesSupported(List.of("code"))
            .subjectTypesSupported(List.of("public"))
            .idTokenSigningAlgValuesSupported(List.of("RS256"))
            .build();
    }

    @GetMapping("/userinfo")
    public UserInfo getUserInfo(@AuthenticationPrincipal UserSecurity userSecurity) {
        return UserInfo.builder()
            .sub(userSecurity.getUser().getId())
            .email(userSecurity.getUsername())
            .emailVerified(true)
            .build();
    }
} 