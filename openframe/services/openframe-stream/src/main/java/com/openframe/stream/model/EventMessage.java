package com.openframe.stream.model;

import java.time.Instant;
import java.util.Map;
import lombok.Data;

@Data
public class EventMessage {
    private String id;
    private String type;
    private String payload;
    private Instant timestamp;
    private String userId;
    private Map<String, String> metadata;
    private ProcessingStatus status;
    
    public enum ProcessingStatus {
        NEW, PROCESSING, PROCESSED, FAILED
    }
}
