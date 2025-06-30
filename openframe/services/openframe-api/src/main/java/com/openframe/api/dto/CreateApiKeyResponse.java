package com.openframe.api.dto;

import lombok.Builder;

/**
 * Response DTO for API key creation (includes the full key)
 */
@Builder
public record CreateApiKeyResponse(
    ApiKeyResponse apiKey,
    String fullKey
) {} 