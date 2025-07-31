package com.openframe.external.dto.event;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Event response")
public class EventResponse {
    
    @Schema(description = "Event ID", example = "event-123")
    private String id;
    
    @Schema(description = "Event type", example = "USER_LOGIN")
    private String type;
    
    @Schema(description = "Event payload data", example = "{\"action\": \"login\", \"ip\": \"192.168.1.1\"}")
    private String payload;
    
    @Schema(description = "Event timestamp", example = "2023-12-01T10:30:00Z")
    private Instant timestamp;
    
    @Schema(description = "User ID associated with the event", example = "user-456")
    private String userId;
} 