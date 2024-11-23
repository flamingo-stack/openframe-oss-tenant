package com.openframe.data.service;

import com.openframe.data.repository.mongo.ApplicationEventRepository;
import com.openframe.data.repository.cassandra.EventStreamRepository;
import com.openframe.data.model.mongo.ApplicationEvent;
import com.openframe.data.model.cassandra.EventStream;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EventDataService {
    
    private final ApplicationEventRepository applicationEventRepository;
    private final EventStreamRepository eventStreamRepository;
    
    @Transactional
    public void storeEvent(ApplicationEvent event, EventStream stream) {
        applicationEventRepository.save(event);
        eventStreamRepository.save(stream);
    }
    
    public List<ApplicationEvent> getApplicationEvents(String userId, Instant start, Instant end) {
        return applicationEventRepository.findByUserIdAndTimestampBetween(userId, start, end);
    }
    
    public List<EventStream> getEventStream(String userId, Instant start, Instant end) {
        return eventStreamRepository.findStreamsByUserAndTimeRange(userId, start, end);
    }
}
