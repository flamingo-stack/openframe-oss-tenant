package com.openframe.data.model.mongo;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "application_events")
public class ApplicationEvent {
    @Id
    private String id;
    private String type;
    private String payload;
    private Instant timestamp;
    private String userId;
    private EventMetadata metadata;

    @Data
    public static class EventMetadata {
        private String source;
        private String version;
        private Map<String, String> tags;
    }
}