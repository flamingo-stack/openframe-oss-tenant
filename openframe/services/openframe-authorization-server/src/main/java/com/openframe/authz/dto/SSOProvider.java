package com.openframe.authz.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SSOProvider {
    GOOGLE("google", "Google OAuth"),
    MICROSOFT("microsoft", "Microsoft OAuth"),
    SLACK("slack", "Slack OAuth");

    private final String provider;
    private final String displayName;

    public static SSOProvider fromProvider(String provider) {
        for (SSOProvider ssoProvider : values()) {
            if (ssoProvider.getProvider().equals(provider)) {
                return ssoProvider;
            }
        }
        return null;
    }
}