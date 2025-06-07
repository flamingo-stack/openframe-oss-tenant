package com.openframe.data.model.cassandra;

import com.openframe.data.model.DownstreamEntity;
import lombok.Data;
import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.*;

import java.time.Instant;
import java.util.Map;

@Table("integrated_tool_event")
public class CassandraITEventEntity implements DownstreamEntity {

    @PrimaryKey
    private EventKey key;

    @Column("payload")
    private String payload;

    @Column("event_type")
    private String eventType;

    @Column("metadata")
    private Map<String, String> metadata;

    @PrimaryKeyClass
    @Data
    public static class EventKey {
        @PrimaryKeyColumn(name = "id", type = PrimaryKeyType.PARTITIONED)
        private String id;

        @PrimaryKeyColumn(name = "timestamp", ordinal = 0, ordering = Ordering.DESCENDING)
        private Instant timestamp;
    }

}
