package com.openframe.data.model;

import java.time.Instant;

import lombok.Data;

@Data
public class TokenConfig {
    private String token;
    private boolean active;
    private Instant createdAt;
    private Instant expiresAt;
} 