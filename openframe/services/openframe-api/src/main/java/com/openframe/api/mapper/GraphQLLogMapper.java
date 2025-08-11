package com.openframe.api.mapper;

import com.openframe.api.dto.audit.*;
import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.api.dto.shared.CursorPaginationInput;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class GraphQLLogMapper {

    public LogFilterOptions toLogFilterOptions(LogFilterInput input) {
        if (input == null) {
            return LogFilterOptions.builder().build();
        }

        return LogFilterOptions.builder()
                .startDate(input.getStartDate())
                .endDate(input.getEndDate())
                .eventTypes(input.getEventTypes())
                .toolTypes(input.getToolTypes())
                .severities(input.getSeverities())
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

    public LogConnection toLogConnection(LogQueryResult result) {
        List<LogEdge> edges = result.getEvents().stream()
                .map(logEvent -> LogEdge.builder()
                        .node(logEvent)
                        .cursor(createLogCursor(logEvent))
                        .build())
                .collect(Collectors.toList());
        
        return LogConnection.builder()
                .edges(edges)
                .pageInfo(result.getPageInfo())
                .build();
    }
    
    private String createLogCursor(LogEvent event) {
        if (event == null || event.getTimestamp() == null) {
            return null;
        }
        return event.getTimestamp().toEpochMilli() + "_" + event.getToolEventId();
    }
}