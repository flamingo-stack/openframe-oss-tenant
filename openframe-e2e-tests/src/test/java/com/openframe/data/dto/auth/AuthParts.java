package com.openframe.data.dto.auth;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class AuthParts {
    private String email;
    private String password;
    private String tenantId;
    private String state;
    private String codeChallenge;
    private String codeVerifier;
    private Map<String, String> cookies;
    private String authorizationCode;
}
