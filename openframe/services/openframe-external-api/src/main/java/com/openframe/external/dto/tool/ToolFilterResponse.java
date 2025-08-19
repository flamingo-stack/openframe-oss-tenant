package com.openframe.external.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Tool filter options")
public class ToolFilterResponse {

    @Schema(description = "Available tool types")
    private List<String> types;

    @Schema(description = "Available tool categories")
    private List<String> categories;

    @Schema(description = "Available platform categories")
    private List<String> platformCategories;
}