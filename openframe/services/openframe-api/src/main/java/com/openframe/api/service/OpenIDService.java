package com.openframe.api.service;

import java.util.Arrays;

import com.openframe.api.dto.oidc.UserInfoRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.openframe.api.dto.oidc.OpenIDConfiguration;
import com.openframe.api.dto.oidc.UserInfo;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OpenIDService {

    private static final Logger log = LoggerFactory.getLogger(OpenIDService.class);

    public ResponseEntity<?> getOpenIDConfiguration() {
        return ResponseEntity.ok(OpenIDConfiguration.builder()
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
            .build());
    }

    public ResponseEntity<?> getUserInfo(UserInfoRequest userInfoRequest) {
        if (userInfoRequest.getUserId() == null) {
            log.warn("No user info found in request");
            return ResponseEntity.status(401)
                    .body(UserInfo.builder()
                            .error("invalid_token")
                            .errorDescription("Invalid or missing token")
                            .build());
        }

        String fullName = (userInfoRequest.getFirstName() != null ? userInfoRequest.getFirstName() : "") +
                (userInfoRequest.getLastName() != null ? " " + userInfoRequest.getLastName() : "").trim();

        return ResponseEntity.ok(UserInfo.builder()
                .sub(userInfoRequest.getUserId())
                .name(fullName.isEmpty() ? null : fullName)
                .givenName(userInfoRequest.getFirstName())
                .familyName(userInfoRequest.getLastName())
                .email(userInfoRequest.getEmail())
                .emailVerified(true)
                .build());
    }
} 