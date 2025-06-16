package com.openframe.api.dto.oauth;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class SocialAuthRequest {
    private String code;

    @JsonProperty("code_verifier")
    private String codeVerifier;

    @JsonProperty("redirect_uri")
    private String redirectUri;
} 