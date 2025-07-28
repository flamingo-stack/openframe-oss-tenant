package com.openframe.external.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Events collection response")
public class EventsResponse {
    
    @Schema(description = "List of events")
    private List<EventResponse> events;
    
    @Schema(description = "Total number of events", example = "42")
    private Integer total;
} 