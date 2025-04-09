
// services/openframe-api/src/main/java/com/openframe/api/service/EventService.java
package com.openframe.api.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.openframe.core.model.Event;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventService {
    
    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Event> kafkaTemplate;

    public List<Event> getEvents(String userId, Instant from, Instant to) {
        // Implementation to fetch events from database
        return null; // TODO: Implement
    }

    public List<Event> getAllEvents() {
        return mongoTemplate.findAll(Event.class);
    }

    public Event getEventById(String id) {
        return mongoTemplate.findById(id, Event.class);
    }

    public Event createEvent(Event event) {
        event.setId(UUID.randomUUID().toString());
        event.setTimestamp(Instant.now());
        
        // Save to MongoDB
        Event savedEvent = mongoTemplate.save(event);
        
        // Publish to Kafka
        kafkaTemplate.send("openframe.events", savedEvent);
        
        return savedEvent;
    }

    public Event updateEvent(String id, Event event) {
        Event existingEvent = getEventById(id);
        if (existingEvent == null) {
            throw new RuntimeException("Event not found with id: " + id);
        }
        
        event.setId(id);
        return mongoTemplate.save(event);
    }

    public void deleteEvent(String id) {
        Event event = getEventById(id);
        if (event != null) {
            mongoTemplate.remove(event);
        }
    }

    public List<Event> getEventsByUserId(String userId) {
        return mongoTemplate.find(
            org.springframework.data.mongodb.core.query.Query.query(
                org.springframework.data.mongodb.core.query.Criteria.where("userId").is(userId)
            ),
            Event.class
        );
    }
}
