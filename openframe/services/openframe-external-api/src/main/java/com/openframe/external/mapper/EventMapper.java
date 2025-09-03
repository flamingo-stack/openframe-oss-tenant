package com.openframe.external.mapper;

import com.openframe.api.dto.event.EventFilterOptions;
import com.openframe.api.dto.event.EventFilters;
import com.openframe.api.dto.event.EventQueryResult;
import com.openframe.data.document.event.Event;
import com.openframe.external.dto.event.EventFilterCriteria;
import com.openframe.external.dto.event.EventFilterResponse;
import com.openframe.external.dto.event.EventResponse;
import com.openframe.external.dto.event.EventsResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class EventMapper extends BaseRestMapper {

    public EventResponse toEventResponse(Event event) {
        if (event == null) {
            return null;
        }

        return EventResponse.builder()
                .id(event.getId())
                .type(event.getType())
                .payload(event.getPayload())
                .timestamp(event.getTimestamp())
                .userId(event.getUserId())
                .build();
    }

    public List<EventResponse> toEventResponseList(List<Event> events) {
        if (events == null) {
            return null;
        }

        return events.stream()
                .map(this::toEventResponse)
                .collect(Collectors.toList());
    }

    public EventFilterResponse toEventFilterResponse(EventFilters filters) {
        if (filters == null) {
            return null;
        }

        return EventFilterResponse.builder()
                .userIds(filters.getUserIds())
                .eventTypes(filters.getEventTypes())
                .build();
    }

    public EventsResponse toEventsResponse(EventQueryResult queryResult) {
        if (queryResult == null) {
            return null;
        }

        List<EventResponse> eventResponses = toEventResponseList(queryResult.getEvents());
        
        return EventsResponse.builder()
                .events(eventResponses)
                .pageInfo(toRestPageInfo(queryResult.getPageInfo()))
                .build();
    }


    public EventFilterOptions toEventFilterOptions(EventFilterCriteria criteria) {
        if (criteria == null) {
            return EventFilterOptions.builder().build();
        }
        
        return EventFilterOptions.builder()
                .userIds(criteria.getUserIds())
                .eventTypes(criteria.getEventTypes())
                .startDate(criteria.getStartDate())
                .endDate(criteria.getEndDate())
                .build();
    }

} 