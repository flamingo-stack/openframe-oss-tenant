package com.openframe.authz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * SSO Configuration status response for login components
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SSOConfigStatusResponse {
    private String provider;
    private boolean enabled;
    private String clientId;
}