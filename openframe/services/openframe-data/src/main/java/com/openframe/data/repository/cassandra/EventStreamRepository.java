package com.openframe.data.repository.cassandra;

import com.openframe.data.model.cassandra.EventStream;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.cassandra.repository.Query;
import java.time.Instant;
import java.util.List;

public interface EventStreamRepository extends CassandraRepository<EventStream, EventStream.EventStreamKey> {
    
    @Query("SELECT * FROM event_streams WHERE userId = ?0 AND timestamp >= ?1 AND timestamp <= ?2")
    List<EventStream> findStreamsByUserAndTimeRange(String userId, Instant start, Instant end);
}
