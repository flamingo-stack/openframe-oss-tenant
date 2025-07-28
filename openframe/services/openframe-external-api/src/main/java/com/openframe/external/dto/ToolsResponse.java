package com.openframe.external.dto;

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
@Schema(description = "Tools collection response")
public class ToolsResponse {
    
    @Schema(description = "List of integrated tools")
    private List<ToolResponse> tools;
    
    @Schema(description = "Total number of tools", example = "5")
    private Integer total;
} 