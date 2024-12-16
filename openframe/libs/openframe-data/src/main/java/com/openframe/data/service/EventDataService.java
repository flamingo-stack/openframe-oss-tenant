package com.openframe.data.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.openframe.data.model.cassandra.EventStream;
import com.openframe.data.model.cassandra.EventStream.EventStreamKey;
import com.openframe.data.model.mongo.ExternalApplicationEvent;
import com.openframe.data.repository.cassandra.EventStreamRepository;
import com.openframe.data.repository.mongo.ExternalApplicationEventRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@ConditionalOnProperty(name = "spring.data.mongodb.enabled", havingValue = "true", matchIfMissing = true)
public class EventDataService {

    private final ExternalApplicationEventRepository mongoEventRepository;
    private final EventStreamRepository cassandraEventRepository;

    public EventDataService(
            ExternalApplicationEventRepository mongoEventRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) EventStreamRepository cassandraEventRepository) {
        this.mongoEventRepository = mongoEventRepository;
        this.cassandraEventRepository = cassandraEventRepository;
    }

    public void saveEvent(ExternalApplicationEvent event) {
        // Save to MongoDB
        mongoEventRepository.save(event);

        // Save to Cassandra if enabled
        if (cassandraEventRepository != null) {
            try {
                EventStream eventStream = new EventStream();
                EventStreamKey key = new EventStreamKey();
                key.setUserId(event.getUserId());
                key.setStreamId(event.getId());
                key.setEventId(UUID.randomUUID());
                key.setTimestamp(event.getTimestamp());
                
                eventStream.setKey(key);
                eventStream.setEventType(event.getType());
                eventStream.setPayload(event.getPayload());
                
                cassandraEventRepository.save(eventStream);
                log.debug("Event saved to Cassandra");
            } catch (Exception e) {
                log.error("Failed to save event to Cassandra", e);
            }
        }
    }

    public List<EventStream> findEventsByUser(String userId) {
        if (cassandraEventRepository != null) {
            return cassandraEventRepository.findByKeyUserId(userId);
        }
        return List.of();
    }

    public List<EventStream> findEventsByUserAndType(String userId, String eventType) {
        if (cassandraEventRepository != null) {
            return cassandraEventRepository.findByKeyUserIdAndEventType(userId, eventType);
        }
        return List.of();
    }

    public List<EventStream> findEventsByUserAndTimeRange(String userId, Instant start, Instant end) {
        if (cassandraEventRepository != null) {
            return cassandraEventRepository.findStreamsByUserAndTimeRange(userId, start, end);
        }
        return List.of();
    }
}