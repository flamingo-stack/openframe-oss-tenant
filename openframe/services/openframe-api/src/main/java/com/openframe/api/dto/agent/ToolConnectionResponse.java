package com.openframe.api.dto.agent;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ToolConnectionResponse {
    private String openframeAgentId;
    private String toolId;
    private String agentId;
    private String status;
}
