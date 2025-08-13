package com.openframe.external.dto.device;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Tag filter item with count for REST API")
public class TagFilterItem {
    
    @Schema(description = "Tag value", example = "production")
    private String value;
    
    @Schema(description = "Tag display label", example = "Production")
    private String label;
    
    @Schema(description = "Count of devices with this tag", example = "15")
    private Integer count;
}