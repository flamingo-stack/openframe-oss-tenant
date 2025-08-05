package com.openframe.authz.service.social;

import com.openframe.authz.dto.SSOProvider;
import com.openframe.authz.dto.SocialAuthRequest;
import com.openframe.authz.dto.TokenResponse;

/**
 * Strategy interface for social authentication providers
 */
public interface SocialAuthStrategy {
    TokenResponse authenticate(SocialAuthRequest request);
    SSOProvider getProvider();
}