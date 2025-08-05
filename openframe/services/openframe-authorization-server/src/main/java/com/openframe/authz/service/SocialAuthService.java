package com.openframe.authz.service;

import com.openframe.authz.dto.SSOProvider;
import com.openframe.authz.dto.SocialAuthRequest;
import com.openframe.authz.dto.TokenResponse;
import com.openframe.authz.exception.SocialAuthException;
import com.openframe.authz.service.social.SocialAuthStrategy;
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
        SSOProvider ssoProvider = SSOProvider.fromProvider(provider);
        if (ssoProvider == null) {
            throw new SocialAuthException("unsupported_provider", "Provider not supported: " + provider);
        }
        
        SocialAuthStrategy strategy = strategies.stream()
                .filter(s -> s.getProvider() == ssoProvider)
                .findFirst()
                .orElseThrow(() -> new SocialAuthException("strategy_not_found", "Strategy not found for provider: " + provider));

        return strategy.authenticate(request);
    }
}