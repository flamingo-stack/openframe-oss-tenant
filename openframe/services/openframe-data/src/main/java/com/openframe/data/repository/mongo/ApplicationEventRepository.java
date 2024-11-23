package com.openframe.data.repository.mongo;

import com.openframe.data.model.mongo.ApplicationEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.time.Instant;
import java.util.List;

public interface ApplicationEventRepository extends MongoRepository<ApplicationEvent, String> {
    
    List<ApplicationEvent> findByUserIdAndTimestampBetween(String userId, Instant start, Instant end);
    
    @Query("{'type': ?0, 'metadata.tags': ?1}")
    List<ApplicationEvent> findByTypeAndTags(String type, Map<String, String> tags);
}
