package com.openframe.data.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "integrated_tools")
public class IntegratedTool {
    @Id
    private String id;
    private String toolType;
    private String name;
    private String description;
    private String url;
    private Integer port;
    private String username;
    private String password;
    private String token;
    private boolean enabled;
    private IntegratedToolConfig config;
}