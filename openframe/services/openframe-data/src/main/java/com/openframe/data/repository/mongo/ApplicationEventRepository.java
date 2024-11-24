package com.openframe.data.repository.mongo;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.openframe.data.model.mongo.ApplicationEvent;

public interface ApplicationEventRepository extends MongoRepository<ApplicationEvent, String> {
    
    List<ApplicationEvent> findByUserIdAndTimestampBetween(String userId, Instant start, Instant end);
    
    @Query("{'type': ?0, 'metadata.tags': ?1}")
    List<ApplicationEvent> findByTypeAndTags(String type, Map<String, String> tags);
}
