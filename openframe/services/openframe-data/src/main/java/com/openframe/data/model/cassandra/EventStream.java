package com.openframe.data.model.cassandra;

import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.Table;
import java.time.Instant;
import java.util.UUID;

@Table("event_streams")
public class EventStream {
    @PrimaryKey
    private EventStreamKey key;
    private String payload;
    private String eventType;
    private Map<String, String> metadata;

    @Data
    public static class EventStreamKey {
        private String userId;
        private String streamId;
        private UUID eventId;
        private Instant timestamp;
    }
}

