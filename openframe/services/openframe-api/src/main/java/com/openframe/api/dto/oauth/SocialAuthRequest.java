package com.openframe.api.dto.oauth;

import lombok.Data;

@Data
public class SocialAuthRequest {
    private String code;
    private String code_verifier;
    private String redirect_uri;
} 