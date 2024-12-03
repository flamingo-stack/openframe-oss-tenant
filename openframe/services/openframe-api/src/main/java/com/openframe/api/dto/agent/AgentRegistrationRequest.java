package com.openframe.api.dto.agent;

import lombok.Data;

@Data
public class AgentRegistrationRequest {
    private String hostname;
    private String ip;
    private String agentVersion;
    private String machineId;
    private String cpuSerialNumber;
    private String macAddress;
    private String osUuid;
} 