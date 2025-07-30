package com.openframe.external.dto.event;

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
@Schema(description = "Available event filters")
public class EventFilterResponse {
    
    @Schema(description = "Available user IDs")
    private List<String> userIds;
    
    @Schema(description = "Available event types")
    private List<String> eventTypes;
}