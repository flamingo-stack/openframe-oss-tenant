package com.openframe.api.dto;

import lombok.Builder;

import java.time.Instant;

/**
 * Request DTO for updating an existing API key
 */
@Builder
public record UpdateApiKeyRequest(
    String name,
    String description,
    Boolean enabled,
    Instant expiresAt
) {} 