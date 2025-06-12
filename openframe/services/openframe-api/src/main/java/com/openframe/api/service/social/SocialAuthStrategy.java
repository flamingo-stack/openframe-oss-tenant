package com.openframe.api.service.social;

import com.openframe.api.dto.oauth.SocialAuthRequest;
import com.openframe.api.dto.oauth.TokenResponse;

public interface SocialAuthStrategy {
    TokenResponse authenticate(SocialAuthRequest request);
    String getProviderName();
} 