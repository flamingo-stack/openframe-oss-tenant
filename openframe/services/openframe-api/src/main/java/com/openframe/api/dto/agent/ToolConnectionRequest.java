package com.openframe.api.dto.agent;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ToolConnectionRequest {
    private String openframeAgentId;
    private String toolId;
    private String agentId;
}

