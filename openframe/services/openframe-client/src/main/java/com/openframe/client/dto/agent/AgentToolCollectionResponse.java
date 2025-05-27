package com.openframe.client.dto.agent;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentToolCollectionResponse {
    private String openframeAgentId;
    private List<ToolInfo> tools;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ToolInfo {
        private String toolType;
        private String agentToolId;
    }
}
