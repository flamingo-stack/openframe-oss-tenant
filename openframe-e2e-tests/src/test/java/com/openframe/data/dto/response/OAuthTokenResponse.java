package com.openframe.data.dto.response;

public record OAuthTokenResponse(
    String accessToken,
    String refreshToken,
    String cookies
) {}

