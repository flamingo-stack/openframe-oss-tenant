package com.openframe.authz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRegisteredClientRequest {

    private String clientId;

    private String clientSecret;

    private Set<String> redirectUris;

    private Set<String> scopes;

    private Set<String> authenticationMethods;
    private Set<String> grantTypes;

    private Boolean requireProofKey;
    private Boolean requireAuthorizationConsent;

    private Long accessTokenTtlSeconds;
    private Long refreshTokenTtlSeconds;
    private Boolean reuseRefreshTokens;
}


