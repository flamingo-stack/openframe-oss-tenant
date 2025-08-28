package com.openframe.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document(collection = "integrated_tool_agents")
public class IntegratedToolAgent {

    // TODO: agent id should not be equal to server id
    @Id
    private String id;
    private String version;
    private List<String> installationCommandArgs;
    private List<String> runCommandArgs;
    private ToolAgentStatus status;
    private List<ToolAgentAsset> assets;
    
}