package com.openframe.api.datafetcher;

import com.netflix.graphql.dgs.DgsComponent;
import com.netflix.graphql.dgs.DgsMutation;
import com.netflix.graphql.dgs.DgsQuery;
import com.netflix.graphql.dgs.InputArgument;
import com.openframe.api.dto.event.*;
import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.api.dto.shared.CursorPaginationInput;
import com.openframe.api.mapper.GraphQLEventMapper;
import com.openframe.api.service.EventService;
import com.openframe.data.document.event.Event;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;

import java.time.Instant;


@DgsComponent
@RequiredArgsConstructor
@Slf4j
@Validated
public class EventDataFetcher {

    private final EventService eventService;
    private final GraphQLEventMapper eventMapper;

    @DgsQuery
    public EventConnection events(
            @InputArgument @Valid EventFilterInput filter,
            @InputArgument @Valid CursorPaginationInput pagination,
            @InputArgument String search) {
        
        log.debug("Getting events with filter: {}, pagination: {}, search: {}", 
                 filter, pagination, search);

        EventFilterOptions filterOptions = eventMapper.toEventFilterOptions(filter);
        CursorPaginationCriteria paginationCriteria = eventMapper.toCursorPaginationCriteria(pagination);

        EventQueryResult result = eventService.queryEvents(filterOptions, paginationCriteria, search);
        EventConnection connection = eventMapper.toEventConnection(result);
        
        log.debug("Successfully fetched {} events with cursor-based pagination", 
                 connection.getEdges().size());

        return connection;
    }

    @DgsQuery
    public Event eventById(@InputArgument @NotBlank String id) {
        log.debug("Getting event by ID: {}", id);
        return eventService.findById(id)
            .orElse(null);
    }

    @DgsQuery
    public EventFilters eventFilters(@InputArgument @Valid EventFilterInput filter) {
        log.debug("Getting event filters with filter: {}", filter);
        return eventService.getEventFilters();
    }

    @DgsMutation
    public Event createEvent(@InputArgument @Valid CreateEventInput input) {
        log.debug("Creating new event with input: {}", input);
        
        Event event = Event.builder()
                .userId(input.getUserId())
                .type(input.getType())
                .payload(input.getData())
                .timestamp(Instant.now())
                .build();
                
        return eventService.createEvent(event);
    }

    @DgsMutation
    public Event updateEvent(@InputArgument @NotBlank String id, 
                           @InputArgument @Valid CreateEventInput input) {
        log.debug("Updating event with ID: {} and input: {}", id, input);
        
        Event event = Event.builder()
                .id(id)
                .userId(input.getUserId())
                .type(input.getType())
                .payload(input.getData())
                .build();
                
        return eventService.updateEvent(id, event);
    }
}
