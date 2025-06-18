package com.openframe.api.service.social;

import com.openframe.api.dto.SSOProvider;
import com.openframe.api.dto.oauth.SocialAuthRequest;
import com.openframe.api.dto.oauth.TokenResponse;

public interface SocialAuthStrategy {
    TokenResponse authenticate(SocialAuthRequest request);

    SSOProvider getProvider();

    /**
     * @deprecated Use getProvider().getProvider() instead
     */
    @Deprecated
    default String getProviderName() {
        return getProvider().getProvider();
    }
} 