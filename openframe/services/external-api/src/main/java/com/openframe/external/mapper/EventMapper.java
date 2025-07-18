package com.openframe.external.mapper;

import com.openframe.core.model.Event;
import com.openframe.external.dto.EventResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class EventMapper {

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
} 