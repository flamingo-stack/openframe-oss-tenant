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

    @Column("event_type")
    private String eventType;

    @Column("operation")
    private String operation;

    @Column("before_data")
    private String beforeData;

    @Column("after_data")
    private String afterData;

    @Column("source")
    private String source;

    @PrimaryKeyClass
    @Data
    public static class CassandraITEventKey {
        @PrimaryKeyColumn(name = "id", type = PrimaryKeyType.PARTITIONED)
        private String id;

        @PrimaryKeyColumn(name = "timestamp", ordinal = 0, ordering = Ordering.DESCENDING)
        private Instant timestamp;

        @PrimaryKeyColumn(name = "tool_name", ordinal = 1, ordering = Ordering.ASCENDING)
        private String toolName;

        @PrimaryKeyColumn(name = "tool_id", ordinal = 2, ordering = Ordering.DESCENDING)
        private String toolId;

        @PrimaryKeyColumn(name = "machine_id", ordinal = 3, ordering = Ordering.ASCENDING)
        private String machineId;

        public String generatePK() {
            return "%s_%s_%s_%s".formatted(toolName, toolId, timestamp, machineId);
        }
    }

}
