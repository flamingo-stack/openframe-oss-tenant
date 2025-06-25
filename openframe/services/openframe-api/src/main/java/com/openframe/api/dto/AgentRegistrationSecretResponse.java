package com.openframe.api.dto;

import java.time.Instant;

import com.openframe.data.model.mongo.AgentRegistrationSecret;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;

@Builder
@Getter
public class AgentRegistrationSecretResponse {

    private String id;
    private String key;
    private Instant createdAt;
    private boolean active;

} 