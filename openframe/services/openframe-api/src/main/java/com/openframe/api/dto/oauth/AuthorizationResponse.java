package com.openframe.api.dto.oauth;

import lombok.Data;
import lombok.Builder;

@Data
@Builder
public class AuthorizationResponse {
    private String code;
    private String state;
    private String redirectUri;
} 