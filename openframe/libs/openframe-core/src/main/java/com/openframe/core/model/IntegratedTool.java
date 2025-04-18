package com.openframe.core.model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Builder
@Document(collection = "integrated_tools")
public class IntegratedTool {
    @Id
    private String id;
    private String name;
    private String description;
    private String icon;
    private List<ToolUrl> toolUrls;
    private String type;
    private String toolType;
    private String category;
    private String platformCategory;
    private boolean enabled;
    private ToolCredentials credentials;
    
    // Layer information
    private String layer;
    private Integer layerOrder;
    private String layerColor;
    
    // Monitoring configuration
    private String metricsPath;
    private String healthCheckEndpoint;
    private Integer healthCheckInterval;
    private Integer connectionTimeout;
    private Integer readTimeout;
    private String[] allowedEndpoints;
}