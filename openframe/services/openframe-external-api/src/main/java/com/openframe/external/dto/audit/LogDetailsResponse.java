package com.openframe.external.dto.audit;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Detailed log information response for REST API")
public class LogDetailsResponse {
    
    @Schema(description = "Tool event ID", example = "evt_123456")
    private String toolEventId;
    
    @Schema(description = "Event type", example = "authentication_success")
    private String eventType;
    
    @Schema(description = "Date when the log was ingested", example = "2024-01-15")
    private String ingestDay;
    
    @Schema(description = "Tool type that generated the log", example = "crowdstrike")
    private String toolType;
    
    @Schema(description = "Severity level", example = "INFO")
    private String severity;
    
    @Schema(description = "User ID associated with the event")
    private String userId;
    
    @Schema(description = "Device ID associated with the event")
    private String deviceId;
    
    @Schema(description = "Summary of the log event")
    private String summary;
    
    @Schema(description = "Full content of the log event")
    private String content;
    
    @Schema(description = "Timestamp of the event")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    private Instant timestamp;
}