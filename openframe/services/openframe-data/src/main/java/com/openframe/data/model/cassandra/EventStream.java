// services/openframe-data/src/main/java/com/openframe/data/model/cassandra/EventStream.java
package com.openframe.data.model.cassandra;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyClass;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyColumn;
import org.springframework.data.cassandra.core.mapping.Table;

import lombok.Data;

@Data
@Table("event_streams")
public class EventStream {
    @PrimaryKey
    private EventStreamKey key;
    
    private String payload;
    private String eventType;
    private Map<String, String> metadata;

    @PrimaryKeyClass
    @Data
    public static class EventStreamKey {
        @PrimaryKeyColumn(name = "user_id", type = PrimaryKeyType.PARTITIONED)
        private String userId;

        @PrimaryKeyColumn(name = "stream_id", ordinal = 0)
        private String streamId;

        @PrimaryKeyColumn(name = "event_id", ordinal = 1)
        private UUID eventId;

        @PrimaryKeyColumn(name = "timestamp", ordinal = 2, ordering = Ordering.DESCENDING)
        private Instant timestamp;
    }
}