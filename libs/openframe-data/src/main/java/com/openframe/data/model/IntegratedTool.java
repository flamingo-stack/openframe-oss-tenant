package com.openframe.data.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.Builder;

@Data
@Builder
@Document(collection = "integrated_tools")
public class IntegratedTool {
    @Id
    private String id;
    private String name;
    private String description;
    private String icon;
    private String url;
    private boolean enabled;
    private String type;
    private String port;
    private String category;
    private String platformCategory;
    private ToolCredentials credentials;
}