package com.openframe.api.mapper;

import com.openframe.api.dto.event.*;
import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.api.dto.shared.CursorPaginationInput;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class GraphQLEventMapper {

    public EventFilterOptions toEventFilterOptions(EventFilterInput input) {
        if (input == null) {
            return EventFilterOptions.builder().build();
        }

        return EventFilterOptions.builder()
                .userIds(input.getUserIds())
                .eventTypes(input.getEventTypes())
                .startDate(input.getStartDate())
                .endDate(input.getEndDate())
                .build();
    }

    public CursorPaginationCriteria toCursorPaginationCriteria(CursorPaginationInput input) {
        if (input == null) {
            return CursorPaginationCriteria.builder().build();
        }

        return CursorPaginationCriteria.builder()
                .limit(input.getLimit())
                .cursor(input.getCursor())
                .build();
    }

    public EventConnection toEventConnection(EventQueryResult result) {
        if (result == null) {
            return EventConnection.builder()
                    .edges(List.of())
                    .pageInfo(null)
                    .build();
        }

        List<EventEdge> edges = result.getEvents().stream()
                .map(event -> EventEdge.builder()
                        .node(event)
                        .cursor(event.getId())
                        .build())
                .collect(Collectors.toList());
        
        return EventConnection.builder()
                .edges(edges)
                .pageInfo(result.getPageInfo())
                .build();
    }
}