package com.openframe.data.repository.mongo;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import com.openframe.data.model.mongo.ExternalApplicationEvent;

@Repository
public interface ExternalApplicationEventRepository extends MongoRepository<ExternalApplicationEvent, String> {
    
    List<ExternalApplicationEvent> findByUserIdAndTimestampBetween(String userId, Instant start, Instant end);
    
    @Query("{'type': ?0, 'metadata.tags': ?1}")
    List<ExternalApplicationEvent> findByTypeAndTags(String type, Map<String, String> tags);
}