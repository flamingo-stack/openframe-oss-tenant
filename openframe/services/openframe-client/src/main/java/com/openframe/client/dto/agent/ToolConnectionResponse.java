package com.openframe.client.dto.agent;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ToolConnectionResponse {
    private String openframeAgentId;
    private String toolType; 
    private String agentToolId;
    private String status;
}
