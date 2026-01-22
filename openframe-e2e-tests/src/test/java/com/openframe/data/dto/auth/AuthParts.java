package com.openframe.data.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthParts {
    private String email;
    private String password;
    private String tenantId;
    private String state;
    private String codeChallenge;
    private String codeVerifier;
    private String cookies;
    private String authorizationCode;
}
