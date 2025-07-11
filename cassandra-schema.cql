-- Create keyspace for OpenFrame events
CREATE KEYSPACE IF NOT EXISTS openframe_events
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE openframe_events;

-- Create unified logs table matching the UnifiedLogEvent Java model
CREATE TABLE IF NOT EXISTS unified_logs (
    ingest_day      text,
    tool_type       text,
    event_type      text,
    timestamp       timestamp,
    tool_event_id   text,
    user_id         text,
    device_id       text,
    severity        text,
    message         text,
    details         map<text, text>,
    PRIMARY KEY ((ingest_day, tool_type), event_type, timestamp, tool_event_id)
) WITH CLUSTERING ORDER BY (event_type ASC, timestamp DESC, tool_event_id ASC);

-- Create secondary indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_unified_logs_event_type ON unified_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_unified_logs_tool_type ON unified_logs(tool_type);
CREATE INDEX IF NOT EXISTS idx_unified_logs_user_id ON unified_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_logs_device_id ON unified_logs(device_id); 