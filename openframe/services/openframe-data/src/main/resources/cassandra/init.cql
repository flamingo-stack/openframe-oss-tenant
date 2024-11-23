CREATE KEYSPACE IF NOT EXISTS openframe_events
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE openframe_events;

CREATE TABLE IF NOT EXISTS event_streams (
    user_id text,
    stream_id text,
    event_id uuid,
    timestamp timestamp,
    payload text,
    event_type text,
    metadata map<text, text>,
    PRIMARY KEY ((user_id, stream_id), event_id, timestamp)
) WITH CLUSTERING ORDER BY (event_id ASC, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_event_type ON event_streams(event_type);
