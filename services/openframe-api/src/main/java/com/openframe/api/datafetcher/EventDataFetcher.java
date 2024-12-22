package com.openframe.api.datafetcher;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;

import com.netflix.graphql.dgs.DgsComponent;
import com.netflix.graphql.dgs.DgsMutation;
import com.netflix.graphql.dgs.DgsQuery;
import com.netflix.graphql.dgs.InputArgument;
import com.openframe.api.model.Event;
import com.openframe.api.service.EventService;

@DgsComponent
public class EventDataFetcher {

    @Autowired
    private EventService eventService;

    @DgsQuery
    public List<Event> events(@InputArgument String userId, 
                            @InputArgument String from,
                            @InputArgument String to) {
        return eventService.getEvents(userId, 
            Instant.parse(from), 
            Instant.parse(to));
    }

    @DgsQuery
    public Event eventById(@InputArgument String id) {
        return eventService.getEventById(id);
    }

    @DgsMutation
    public Event createEvent(@InputArgument("input") Event event) {
        return eventService.createEvent(event);
    }

    @DgsMutation
    public Event updateEvent(@InputArgument String id, 
                           @InputArgument("input") Event event) {
        return eventService.updateEvent(id, event);
    }
}
