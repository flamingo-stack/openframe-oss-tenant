package com.openframe.api.dto;

import lombok.Builder;

import java.time.Instant;

/**
 * Request DTO for creating a new API key
 */
@Builder
public record CreateApiKeyRequest(
    String name,
    String description,
    Instant expiresAt
) {} 