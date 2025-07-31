package com.openframe.external.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Tool filter criteria for REST API")
public class ToolFilterCriteria {
    
    @Schema(description = "Filter by enabled status")
    private Boolean enabled;
    
    @Schema(description = "Tool type to filter by")
    private String type;
    
    @Schema(description = "Tool category to filter by")
    private String category;
    
    @Schema(description = "Platform category to filter by")
    private String platformCategory;
}