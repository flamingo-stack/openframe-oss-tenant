package com.openframe.external.dto.device;

import com.openframe.external.dto.shared.PageInfo;
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
@Schema(description = "Paginated list of devices")
public class DevicesResponse {

    @Schema(description = "List of devices")
    private List<DeviceResponse> devices;

    @Schema(description = "Pagination information")
    private PageInfo pageInfo;

    @Schema(description = "Total count of filtered devices")
    private Integer filteredCount;
} 