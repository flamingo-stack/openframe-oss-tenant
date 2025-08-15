package com.openframe.api.dto.event;

import com.openframe.api.dto.shared.CursorPageInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * GraphQL connection type for cursor-based event pagination.
 * Follows the Relay Cursor Connections Specification.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventConnection {
    private List<EventEdge> edges;
    private CursorPageInfo pageInfo;
}