package com.openframe.core.repository;

import com.openframe.core.model.Event;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.time.Instant;
import java.util.List;

public interface EventRepository extends MongoRepository<Event, String> {
    List<Event> findByUserIdAndTimestampBetween(String userId, Instant start, Instant end);
    
    @Query("{'type': ?0, 'timestamp': {'$gte': ?1}}")
    List<Event> findRecentEventsByType(String type, Instant since);
}
