package com.openframe.api.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventFilterOptions {
    private List<String> userIds;
    private List<String> eventTypes;
    private LocalDate startDate;
    private LocalDate endDate;
}