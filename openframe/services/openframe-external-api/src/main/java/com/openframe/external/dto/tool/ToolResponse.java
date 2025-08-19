package com.openframe.external.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Integrated tool response")
public class ToolResponse {
    
    @Schema(description = "Tool ID", example = "tool-123")
    private String id;
    
    @Schema(description = "Tool name", example = "tactical-rmm")
    private String name;
    
    @Schema(description = "Tool description", example = "Remote monitoring and management tool")
    private String description;
    
    @Schema(description = "Tool icon", example = "tactical-rmm-icon")
    private String icon;
    
    @Schema(description = "Tool URLs")
    private List<ToolUrlResponse> toolUrls;
    
    @Schema(description = "Tool type", example = "rmm")
    private String type;
    
    @Schema(description = "Tool type classification", example = "monitoring")
    private String toolType;
    
    @Schema(description = "Tool category", example = "monitoring")
    private String category;
    
    @Schema(description = "Platform category", example = "web")
    private String platformCategory;
    
    @Schema(description = "Whether the tool is enabled", example = "true")
    private Boolean enabled;
    
    @Schema(description = "Tool credentials")
    private ToolCredentialsResponse credentials;
} 