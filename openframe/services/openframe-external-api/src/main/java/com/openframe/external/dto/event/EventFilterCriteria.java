package com.openframe.external.dto.event;

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
@Schema(description = "Event filter criteria for REST API")
public class EventFilterCriteria {
    
    @Schema(description = "User IDs to filter by")
    private List<String> userIds;
    
    @Schema(description = "Event types to filter by")
    private List<String> eventTypes;
    
    @Schema(description = "Start date for filtering events", example = "2024-01-01")
    private LocalDate startDate;
    
    @Schema(description = "End date for filtering events", example = "2024-12-31")
    private LocalDate endDate;
}