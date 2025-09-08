package com.openframe.external.dto.device;

import com.openframe.data.document.device.DeviceStatus;
import com.openframe.data.document.device.DeviceType;
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
@Schema(description = "Device filter criteria for REST API")
public class DeviceFilterCriteria {
    
    @Schema(description = "Device statuses to filter by")
    private List<DeviceStatus> statuses;
    
    @Schema(description = "Device types to filter by")
    private List<DeviceType> deviceTypes;
    
    @Schema(description = "Operating system types to filter by")
    private List<String> osTypes;
    
    @Schema(description = "Organization IDs to filter by")
    private List<String> organizationIds;
    
    @Schema(description = "Tag names to filter by")
    private List<String> tagNames;
}