package com.openframe.external.dto.device;

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
@Schema(description = "Device filter options with counts")
public class DeviceFilterResponse {

    @Schema(description = "Available device statuses with counts")
    private List<DeviceFilterItem> statuses;

    @Schema(description = "Available device types with counts")
    private List<DeviceFilterItem> deviceTypes;

    @Schema(description = "Available OS types with counts")
    private List<DeviceFilterItem> osTypes;

    @Schema(description = "Available organization IDs with counts")
    private List<DeviceFilterItem> organizationIds;

    @Schema(description = "Available tags with counts")
    private List<TagFilterItem> tags;

    @Schema(description = "Total count of filtered devices")
    private Integer filteredCount;

} 