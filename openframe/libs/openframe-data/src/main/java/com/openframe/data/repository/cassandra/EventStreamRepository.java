package com.openframe.data.repository.cassandra;

import java.time.Instant;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.cassandra.repository.Query;
import org.springframework.stereotype.Repository;

import com.openframe.data.model.cassandra.EventStream;
import com.openframe.data.model.cassandra.EventStream.EventStreamKey;

@Repository
@ConditionalOnProperty(name = "spring.data.cassandra.enabled", havingValue = "true", matchIfMissing = false)
public interface EventStreamRepository extends CassandraRepository<EventStream, EventStreamKey> {
    
    List<EventStream> findByUserId(String userId);
    
    List<EventStream> findByUserIdAndEventType(String userId, String eventType);
    
    @Query("SELECT * FROM event_stream WHERE user_id = ?0 AND timestamp >= ?1 AND timestamp <= ?2 ALLOW FILTERING")
    List<EventStream> findStreamsByUserAndTimeRange(String userId, Instant start, Instant end);
}