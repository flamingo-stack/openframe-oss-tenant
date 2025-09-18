package com.openframe.data.model.cassandra;

import lombok.Data;
import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.*;

import java.time.Instant;
import java.util.Map;

/**
 * Unified, NIST-compliant log event for integrated tools (Fleet, Meshcentral, Tactical-RMM, etc.).
 * Partitioned for scalable Cassandra storage and optimized for filtering by day, tool, and event type.
 */
@Table("unified_logs")
@Data
public class UnifiedLogEvent {
    @PrimaryKey
    private UnifiedLogEventKey key;

    /** User ID associated with the event, if available. */
    @Column("user_id")
    private String userId;

    /** Device ID or machine identifier, if applicable. */
    @Column("device_id")
    private String deviceId;

    /** Severity level (info, warning, error, etc.). */
    @Column("severity")
    private String severity;

    /** Human-readable message for the event. */
    @Column("message")
    private String message;

    /** Tool-specific or event-specific details as long text (JSON or plain text). */
    @Column("debezium_message")
    private String debeziumMessage;

    /** Tool-specific or event-specific details (flexible, JSON). */
    @Column("details")
    private String details;

    @PrimaryKeyClass
    @Data
    public static class UnifiedLogEventKey {
        /** Partition by ingest day (YYYY-MM-DD) for time-series scalability. */
        @PrimaryKeyColumn(name = "ingest_day", ordinal = 0, type = PrimaryKeyType.PARTITIONED)
        private String ingestDay;

        /** Partition by tool type (meshcentral, tactical-rmm, fleet-mdm, etc.). */
        @PrimaryKeyColumn(name = "tool_type", ordinal = 1, type = PrimaryKeyType.PARTITIONED)
        private String toolType;

        /** Cluster by event type (login, logout, script, etc.). */
        @PrimaryKeyColumn(name = "event_type", ordinal = 2, type = PrimaryKeyType.CLUSTERED)
        private String eventType;

        /** Cluster by event timestamp (descending for recent-first queries). */
        @PrimaryKeyColumn(name = "event_timestamp", ordinal = 3, type = PrimaryKeyType.CLUSTERED, ordering = Ordering.DESCENDING)
        private Instant eventTimestamp;

        /** Cluster by original event ID from the tool, for uniqueness. */
        @PrimaryKeyColumn(name = "tool_event_id", ordinal = 4, type = PrimaryKeyType.CLUSTERED)
        private String toolEventId;
    }
}
