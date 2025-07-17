package com.openframe.api.service;

import com.openframe.core.model.Event;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {
    
    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Event> kafkaTemplate;

    public List<Event> getEvents(String userId, Instant from, Instant to) {
        log.debug("Getting events for user: {} from {} to {}", userId, from, to);
        
        Query query = new Query();
        
        if (userId != null) {
            query.addCriteria(Criteria.where("userId").is(userId));
        }
        
        if (from != null && to != null) {
            query.addCriteria(Criteria.where("timestamp").gte(from).lte(to));
        } else if (from != null) {
            query.addCriteria(Criteria.where("timestamp").gte(from));
        } else if (to != null) {
            query.addCriteria(Criteria.where("timestamp").lte(to));
        }
        
        return mongoTemplate.find(query, Event.class);
    }

    public Optional<Event> getEventById(String id) {
        log.debug("Getting event by ID: {}", id);
        Event event = mongoTemplate.findById(id, Event.class);
        return Optional.ofNullable(event);
    }

    public Event createEvent(Event event) {
        log.debug("Creating new event: {}", event);
        
        event.setId(UUID.randomUUID().toString());
        event.setTimestamp(Instant.now());

        Event savedEvent = mongoTemplate.save(event);
        log.info("Event saved with ID: {}", savedEvent.getId());

        try {
            kafkaTemplate.send("openframe.events", savedEvent);
            log.debug("Event published to Kafka: {}", savedEvent.getId());
        } catch (Exception e) {
            log.error("Failed to publish event to Kafka: {}", savedEvent.getId(), e);
            // Don't fail the operation if Kafka is unavailable
        }
        
        return savedEvent;
    }

    public Event updateEvent(String id, Event event) {
        log.debug("Updating event with ID: {}", id);
        
        Optional<Event> existingEvent = getEventById(id);
        if (existingEvent.isEmpty()) {
            throw new RuntimeException("Event not found with id: " + id);
        }
        
        event.setId(id);
        Event savedEvent = mongoTemplate.save(event);
        log.info("Event updated: {}", savedEvent.getId());
        
        return savedEvent;
    }

    public void deleteEvent(String id) {
        log.debug("Deleting event with ID: {}", id);
        
        Optional<Event> event = getEventById(id);
        if (event.isPresent()) {
            mongoTemplate.remove(event.get());
            log.info("Event deleted: {}", id);
        } else {
            log.warn("Attempted to delete non-existent event: {}", id);
        }
    }
} 