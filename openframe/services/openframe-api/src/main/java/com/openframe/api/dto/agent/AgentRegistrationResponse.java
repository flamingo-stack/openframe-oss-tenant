package com.openframe.api.dto.agent;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AgentRegistrationResponse {
    private String clientId;
    private String clientSecret;
} 