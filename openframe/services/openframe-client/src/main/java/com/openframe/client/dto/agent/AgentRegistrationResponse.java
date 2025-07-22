package com.openframe.client.dto.agent;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentRegistrationResponse {

    private String machineId;
    private String clientId;
    private String clientSecret;
} 