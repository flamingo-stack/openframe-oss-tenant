package com.openframe.stream.model;

import lombok.Data;

@Data
public class IntegratedToolEventKafkaMessage {
    private String toolEventId;
    private String userId;
    private String deviceId;
    private String ingestDay;
    private String toolType;
    private String eventType;
    private String severity;
    private String summary;
    private Long eventTimestamp;
}

