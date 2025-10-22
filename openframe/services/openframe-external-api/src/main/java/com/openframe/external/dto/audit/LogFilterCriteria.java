package com.openframe.external.dto.audit;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Log filter criteria for REST API")
public class LogFilterCriteria {
    
    @Schema(description = "Start date for filtering logs", example = "2024-01-01")
    private LocalDate startDate;
    
    @Schema(description = "End date for filtering logs", example = "2024-12-31")
    private LocalDate endDate;
    
    @Schema(description = "Tool types to filter by")
    private List<String> toolTypes;
    
    @Schema(description = "Event types to filter by")
    private List<String> eventTypes;
    
    @Schema(description = "Severity levels to filter by")
    private List<String> severities;
    
    @Schema(description = "Organization IDs to filter by")
    private List<String> organizationIds;
    
    @Schema(description = "Device ID to filter by (exact matching)")
    private String deviceId;
}