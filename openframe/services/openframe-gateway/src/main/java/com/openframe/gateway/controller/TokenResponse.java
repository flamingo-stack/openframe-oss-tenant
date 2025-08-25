package com.openframe.gateway.controller;

public record TokenResponse(
    String access_token,
    String refresh_token,
    String token_type,
    Integer expires_in,
    String scope
) {}
