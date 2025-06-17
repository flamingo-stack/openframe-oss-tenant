package com.openframe.api.dto;

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

    public static String getDisplayName(String provider) {
        SSOProvider ssoProvider = fromProvider(provider);
        return ssoProvider != null ? ssoProvider.getDisplayName() : provider;
    }
} 