package com.openframe.api.datafetcher;

import java.time.Instant;
import java.util.List;

import com.netflix.graphql.dgs.DgsComponent;
import com.netflix.graphql.dgs.DgsMutation;
import com.netflix.graphql.dgs.DgsQuery;
import com.netflix.graphql.dgs.InputArgument;
import com.openframe.api.service.EventService;
import com.openframe.core.model.Event;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@DgsComponent
@RequiredArgsConstructor
@Slf4j
public class EventDataFetcher {

    private final EventService eventService;

    @DgsQuery
    public List<Event> events(@InputArgument String userId, 
                            @InputArgument String from,
                            @InputArgument String to) {
        log.debug("Getting events for userId: {}, from: {}, to: {}", userId, from, to);
        return eventService.getEvents(userId, Instant.parse(from), Instant.parse(to));
    }

    @DgsQuery
    public Event eventById(@InputArgument String id) {
        log.debug("Getting event by ID: {}", id);
        return eventService.getEventById(id)
            .orElse(null);
    }

    @DgsMutation
    public Event createEvent(@InputArgument("input") Event event) {
        log.debug("Creating new event");
        return eventService.createEvent(event);
    }

    @DgsMutation
    public Event updateEvent(@InputArgument String id, 
                           @InputArgument("input") Event event) {
        log.debug("Updating event with ID: {}", id);
        return eventService.updateEvent(id, event);
    }
}
