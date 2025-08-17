package com.openframe.api.dto.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * GraphQL input filter for Log operations.
 * Optimized for GraphQL schema and client requirements.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogFilterInput {
    
    private LocalDate startDate;
    
    private LocalDate endDate;
    
    private List<String> eventTypes;
    
    private List<String> toolTypes;
    
    private List<String> severities;
}