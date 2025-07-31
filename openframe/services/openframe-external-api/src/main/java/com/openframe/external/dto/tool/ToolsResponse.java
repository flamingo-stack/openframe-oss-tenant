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
@Schema(description = "Response containing list of integrated tools")
public class ToolsResponse {
    
    @Schema(description = "List of integrated tools")
    private List<ToolResponse> tools;
} 