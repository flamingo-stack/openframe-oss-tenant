package com.openframe.external.dto.audit;

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
@Schema(description = "Log event response")
public class LogResponse {
    
    @Schema(description = "Tool event ID", example = "evt_123456")
    private String toolEventId;
    
    @Schema(description = "Event type", example = "login")
    private String eventType;
    
    @Schema(description = "Ingest day in YYYY-MM-DD format", example = "2024-01-15")
    private String ingestDay;
    
    @Schema(description = "Tool type", example = "meshcentral")
    private String toolType;
    
    @Schema(description = "Severity level", example = "INFO")
    private String severity;
    
    @Schema(description = "User ID associated with the event")
    private String userId;
    
    @Schema(description = "Device ID associated with the event")
    private String deviceId;
    
    @Schema(description = "Event summary")
    private String summary;
    
    @Schema(description = "Event timestamp")
    private Instant timestamp;
}