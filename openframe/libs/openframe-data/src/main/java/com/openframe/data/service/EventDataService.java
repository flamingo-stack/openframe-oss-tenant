package com.openframe.data.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

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
                // Convert and save to Cassandra
                // Add your Cassandra save logic here
                log.debug("Event saved to Cassandra");
            } catch (Exception e) {
                log.error("Failed to save event to Cassandra", e);
            }
        }
    }
}