package com.openframe.data.dto.auth;

public record AuthTokens(
        String accessToken,
        String refreshToken,
        String cookies
) {
}

