package com.openframe.core.model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@Document(collection = "integrated_tool_agents")
public class IntegratedToolAgent {
    @Id
    private String id;
    private String version;
} 