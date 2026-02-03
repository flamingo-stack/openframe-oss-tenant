package com.openframe.data.dto.log;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogDetails {
    private String toolEventId;
    private String eventType;
    private String ingestDay;
    private String toolType;
    private String severity;
    private String userId;
    private String deviceId;
    private String hostname;
    private String organizationId;
    private String organizationName;
    private String message;
    private String timestamp;
    private String details;
}
