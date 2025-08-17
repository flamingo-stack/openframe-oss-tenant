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
@Schema(description = "Device filter item with count for REST API")
public class DeviceFilterItem {
    
    @Schema(description = "Filter option value", example = "online")
    private String value;
    
    @Schema(description = "Display label for the filter option", example = "Online")
    private String label;
    
    @Schema(description = "Count of devices matching this filter option", example = "42")
    private Integer count;
}