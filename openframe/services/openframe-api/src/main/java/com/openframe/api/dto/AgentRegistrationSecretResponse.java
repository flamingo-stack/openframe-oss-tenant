package com.openframe.api.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Builder
@Getter
public class AgentRegistrationSecretResponse {

    private String id;
    private String key;
    private Instant createdAt;
    private boolean active;

} 