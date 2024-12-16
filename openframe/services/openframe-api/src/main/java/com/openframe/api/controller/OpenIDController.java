package com.openframe.api.controller;

import java.util.Arrays;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.dto.oidc.OpenIDConfiguration;
import com.openframe.api.dto.oidc.UserInfo;
import com.openframe.api.security.UserSecurity;
import com.openframe.api.service.OAuthService;
import com.openframe.core.model.User;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/.well-known")
@RequiredArgsConstructor
public class OpenIDController {
    
    private final OAuthService oauthService;

    @GetMapping(value = "/openid-configuration", produces = MediaType.APPLICATION_JSON_VALUE)
    public OpenIDConfiguration getConfiguration() {
        return OpenIDConfiguration.builder()
            .issuer("https://auth.openframe.com")
            .authorizationEndpoint("https://auth.openframe.com/oauth/authorize")
            .tokenEndpoint("https://auth.openframe.com/oauth/token")
            .userinfoEndpoint("https://auth.openframe.com/oidc/userinfo")
            .jwksUri("https://auth.openframe.com/.well-known/jwks.json")
            .responseTypesSupported(Arrays.asList("code", "token", "id_token", "code token", "code id_token"))
            .subjectTypesSupported(Arrays.asList("public", "pairwise"))
            .idTokenSigningAlgValuesSupported(Arrays.asList("RS256", "ES256"))
            .scopesSupported(Arrays.asList("openid", "profile", "email", "address", "phone"))
            .tokenEndpointAuthMethodsSupported(Arrays.asList("client_secret_basic", "client_secret_post"))
            .claimsSupported(Arrays.asList("sub", "iss", "auth_time", "name", "given_name", "family_name", "email"))
            .build();
    }

    @GetMapping(value = "/userinfo", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserInfo> getUserInfo(@AuthenticationPrincipal UserSecurity userSecurity) {
        if (userSecurity == null || userSecurity.getUser() == null) {
            return ResponseEntity.status(401)
                .body(UserInfo.builder()
                    .error("invalid_token")
                    .errorDescription("Invalid or missing token")
                    .build());
        }

        User user = userSecurity.getUser();
        String fullName = (user.getFirstName() != null ? user.getFirstName() : "") + 
                         (user.getLastName() != null ? " " + user.getLastName() : "").trim();

        return ResponseEntity.ok(UserInfo.builder()
            .sub(user.getId())
            .name(fullName.isEmpty() ? null : fullName)
            .givenName(user.getFirstName())
            .familyName(user.getLastName())
            .email(user.getEmail())
            .emailVerified(true)
            .build());
    }
} 