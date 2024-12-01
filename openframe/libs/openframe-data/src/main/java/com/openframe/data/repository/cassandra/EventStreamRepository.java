package com.openframe.data.repository.cassandra;

import java.time.Instant;
import java.util.List;

import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.cassandra.repository.Query;

import com.openframe.data.model.cassandra.EventStream;

public interface EventStreamRepository extends CassandraRepository<EventStream, EventStream.EventStreamKey> {
    
    @Query("SELECT * FROM event_streams WHERE user_id = ?0 ALLOW FILTERING")
    List<EventStream> findByUserId(String userId);
    
    @Query("SELECT * FROM event_streams WHERE user_id = ?0 AND event_type = ?1 ALLOW FILTERING")
    List<EventStream> findByUserIdAndEventType(String userId, String eventType);

    @Query(value = "SELECT * FROM event_streams WHERE user_id = ?0 AND timestamp >= ?1 AND timestamp <= ?2 ALLOW FILTERING")
    List<EventStream> findStreamsByUserAndTimeRange(String userId, Instant start, Instant end);
}