package com.openframe.external.dto.event;

import com.openframe.external.dto.shared.PageInfo;
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
@Schema(description = "Paginated list of events")
public class EventsResponse {
    
    @Schema(description = "List of events")
    private List<EventResponse> events;
    
    @Schema(description = "Pagination information")
    private PageInfo pageInfo;
} 