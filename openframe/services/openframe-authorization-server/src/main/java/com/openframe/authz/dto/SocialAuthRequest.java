package com.openframe.authz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Social authentication request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SocialAuthRequest {
    private String code;
    private String state;
    private String redirectUri;
    private String idToken;
}