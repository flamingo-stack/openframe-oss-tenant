package com.openframe.data.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.openframe.data.model.cassandra.EventStream;
import com.openframe.data.model.mongo.ExternalApplicationEvent;
import com.openframe.data.repository.cassandra.EventStreamRepository;
import com.openframe.data.repository.mongo.ExternalApplicationEventRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventDataService {
    
    private final ExternalApplicationEventRepository externalExternalApplicationEventRepository;
    private final EventStreamRepository eventStreamRepository;
    
    @Transactional
    public void storeEvent(ExternalApplicationEvent event, EventStream stream) {
        externalExternalApplicationEventRepository.save(event);
        eventStreamRepository.save(stream);
    }
    
    public EventStream storeEventStream(EventStream event) {
        return eventStreamRepository.save(event);
    }
    
    public List<ExternalApplicationEvent> getExternalApplicationEvents(String userId, Instant start, Instant end) {
        return externalExternalApplicationEventRepository.findByUserIdAndTimestampBetween(userId, start, end);
    }
    
    public List<EventStream> getEventStream(String userId, Instant start, Instant end) {
        return eventStreamRepository.findStreamsByUserAndTimeRange(userId, start, end);
    }

    public List<EventStream> findEventsByUser(String userId) {
        return eventStreamRepository.findByUserId(userId);
    }

    public List<EventStream> findEventsByUserAndType(String userId, String eventType) {
        return eventStreamRepository.findByUserIdAndEventType(userId, eventType);
    }
}