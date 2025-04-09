package com.openframe.data.model.cassandra;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.Column;
import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyClass;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyColumn;
import org.springframework.data.cassandra.core.mapping.Table;

import lombok.Data;

@Table("event_streams")
@Data
public class EventStream {
    @PrimaryKey
    private EventStreamKey key;
    
    @Column("payload")
    private String payload;
    
    @Column("event_type")  // Fixed column name to match database
    private String eventType;
    
    @Column("metadata")
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