package com.openframe.api.dto.event;

import com.openframe.data.document.event.Event;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * GraphQL edge type for event connections.
 * Contains the event node and its cursor for pagination.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventEdge {
    private Event node;
    private String cursor;
}