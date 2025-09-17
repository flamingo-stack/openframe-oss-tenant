package com.openframe.api.service;

import com.openframe.api.dto.event.EventFilterOptions;
import com.openframe.api.dto.event.EventFilters;
import com.openframe.api.dto.event.EventQueryResult;
import com.openframe.api.dto.shared.CursorPageInfo;
import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.data.document.event.Event;
import com.openframe.data.document.event.filter.EventQueryFilter;
import com.openframe.data.repository.event.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {
    
    private final EventRepository eventRepository;

    public EventQueryResult queryEvents(EventFilterOptions filterOptions,
                                     CursorPaginationCriteria paginationCriteria,
                                     String search) {
        log.debug("Querying events with filter: {}, pagination: {}, search: {}",
                filterOptions, paginationCriteria, search);

        CursorPaginationCriteria normalizedPagination = paginationCriteria.normalize();
        EventQueryFilter queryFilter = buildQueryFilter(filterOptions);
        Query query = eventRepository.buildEventQuery(queryFilter, search);
        
        List<Event> pageItems = fetchPageItems(query, normalizedPagination);
        boolean hasNextPage = pageItems.size() == normalizedPagination.getLimit();
        
        CursorPageInfo pageInfo = buildPageInfo(pageItems, hasNextPage, normalizedPagination.hasCursor());
        
        return EventQueryResult.builder()
                .events(pageItems)
                .pageInfo(pageInfo)
                .build();
    }

    public Optional<Event> findById(String id) {
        log.debug("Finding event by ID: {}", id);
        return eventRepository.findById(id);
    }

    public Event createEvent(Event event) {
        log.debug("Creating new event: {}", event);
        
        event.setId(UUID.randomUUID().toString());
        event.setTimestamp(Instant.now());

        Event savedEvent = eventRepository.save(event);
        log.info("Event saved with ID: {}", savedEvent.getId());
        log.debug("Event published to Kafka: {}", savedEvent.getId());
        
        return savedEvent;
    }

    public Event updateEvent(String id, Event event) {
        log.debug("Updating event with ID: {}", id);
        
        Optional<Event> existingEvent = findById(id);
        if (existingEvent.isEmpty()) {
            throw new RuntimeException("Event not found with id: " + id);
        }
        
        event.setId(id);
        Event savedEvent = eventRepository.save(event);
        log.info("Event updated: {}", savedEvent.getId());
        
        return savedEvent;
    }

    public EventFilters getEventFilters() {
        log.debug("Getting event filters");
        
        List<String> userIds = eventRepository.findDistinctUserIds();
        List<String> eventTypes = eventRepository.findDistinctEventTypes();
        
        return EventFilters.builder()
                .userIds(userIds)
                .eventTypes(eventTypes)
                .build();
    }
    
    private List<Event> fetchPageItems(Query query, CursorPaginationCriteria criteria) {
        List<Event> events = eventRepository.findEventsWithCursor(
                query, criteria.getCursor(), criteria.getLimit() + 1);
        return events.size() > criteria.getLimit() 
                ? events.subList(0, criteria.getLimit())
                : events;
    }
    
    private EventQueryFilter buildQueryFilter(EventFilterOptions filterOptions) {
        if (filterOptions == null) {
            return EventQueryFilter.builder().build();
        }
        
        return EventQueryFilter.builder()
                .userIds(filterOptions.getUserIds())
                .eventTypes(filterOptions.getEventTypes())
                .startDate(filterOptions.getStartDate())
                .endDate(filterOptions.getEndDate())
                .build();
    }
    
    private CursorPageInfo buildPageInfo(List<Event> events, boolean hasNextPage, boolean hasPreviousPage) {
        String startCursor = events.isEmpty() ? null : events.getFirst().getId();
        String endCursor = events.isEmpty() ? null : events.getLast().getId();
        
        return CursorPageInfo.builder()
                .hasNextPage(hasNextPage)
                .hasPreviousPage(hasPreviousPage)
                .startCursor(startCursor)
                .endCursor(endCursor)
                .build();
    }
}