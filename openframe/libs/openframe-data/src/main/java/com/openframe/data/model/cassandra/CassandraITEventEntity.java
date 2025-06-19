package com.openframe.data.model.cassandra;

import lombok.Data;
import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.*;

import java.time.Instant;
import java.util.Map;

@Table("integrated_tool_event")
@Data
public class CassandraITEventEntity {

    @PrimaryKey
    private CassandraITEventEntity.CassandraITEventKey key;

    @Column("payload")
    private Map<String, String> payload;

    @Column("event_type")  // Fixed column name to match database
    private String eventType;

    @PrimaryKeyClass
    @Data
    public static class CassandraITEventKey {
        @PrimaryKeyColumn(name = "id", type = PrimaryKeyType.PARTITIONED)
        private String id;

        @PrimaryKeyColumn(name = "timestamp", ordinal = 0, ordering = Ordering.DESCENDING)
        private Instant timestamp;

        @PrimaryKeyColumn(name = "tool_name", ordinal = 1, ordering = Ordering.ASCENDING)
        private String toolName;
    }

}
