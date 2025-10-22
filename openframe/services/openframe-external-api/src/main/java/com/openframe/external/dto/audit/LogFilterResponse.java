package com.openframe.external.dto.audit;

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
@Schema(description = "Available log filter options")
public class LogFilterResponse {

    @Schema(description = "Available event types")
    private List<String> eventTypes;

    @Schema(description = "Available tool types")
    private List<String> toolTypes;

    @Schema(description = "Available severities")
    private List<String> severities;

    @Schema(description = "Available organizations")
    private List<OrganizationFilterResponse> organizations;
}