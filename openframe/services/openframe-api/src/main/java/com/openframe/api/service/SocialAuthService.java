package com.openframe.api.service;

import com.openframe.api.dto.oauth.SocialAuthRequest;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.exception.SocialAuthException;
import com.openframe.api.service.social.SocialAuthStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocialAuthService {

    private final List<SocialAuthStrategy> strategies;

    public TokenResponse authenticate(String provider, SocialAuthRequest request) {
        SocialAuthStrategy strategy = strategies.stream()
                .filter(s -> s.getProviderName().equalsIgnoreCase(provider))
                .findFirst()
                .orElseThrow(() -> new SocialAuthException("unsupported_provider", "Unsupported provider: " + provider));

        return strategy.authenticate(request);
    }
}