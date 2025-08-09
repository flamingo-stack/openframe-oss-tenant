package com.openframe.data.model.kafka;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    
    @JsonProperty("event_timestamp")
    private Long eventTimestamp;
}
