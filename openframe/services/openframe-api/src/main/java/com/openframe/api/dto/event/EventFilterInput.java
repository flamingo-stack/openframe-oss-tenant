package com.openframe.api.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * GraphQL input type for event filtering.
 * Maps to the GraphQL schema EventFilterInput.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventFilterInput {
    private List<String> userIds;
    private List<String> eventTypes;
    private LocalDate startDate;
    private LocalDate endDate;
}