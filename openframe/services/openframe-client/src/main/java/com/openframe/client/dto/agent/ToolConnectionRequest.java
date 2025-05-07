package com.openframe.client.dto.agent;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ToolConnectionRequest {
    private String openframeAgentId;

    private String toolType;

    @NotBlank(message = "agentToolId is required")
    private String agentToolId;
}

