package com.openframe.api.dto.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogEvent {
    private String toolEventId;
    private String eventType;
    private String ingestDay;
    private String toolType;
    private String severity;
    private String userId;
    private String deviceId;
    private String summary;
    private Instant timestamp;
} 