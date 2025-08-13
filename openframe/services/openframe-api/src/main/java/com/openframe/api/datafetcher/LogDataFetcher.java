package com.openframe.api.datafetcher;

import com.netflix.graphql.dgs.*;
import com.openframe.api.dto.audit.*;
import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.api.dto.shared.CursorPaginationInput;
import com.openframe.api.mapper.GraphQLLogMapper;
import com.openframe.api.service.LogService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.Optional;

@DgsComponent
@Slf4j
@Validated
@AllArgsConstructor
public class LogDataFetcher {

    private final LogService logService;
    private final GraphQLLogMapper logMapper;

    @DgsQuery
    public LogFilters logFilters(@InputArgument @Valid LogFilterInput filter) {
        log.debug("Fetching audit filters with filter: {}", filter);

        LogFilterOptions filterOptions = logMapper.toLogFilterOptions(filter);
        return logService.getLogFilters(filterOptions);
    }

    @DgsQuery
    public LogConnection logs(
            @InputArgument @Valid LogFilterInput filter,
            @InputArgument @Valid CursorPaginationInput pagination,
            @InputArgument String search) {
        
        log.debug("Fetching logs with filter: {}, pagination: {}, search: {}", 
                 filter, pagination, search);

        LogFilterOptions filterOptions = logMapper.toLogFilterOptions(filter);
        CursorPaginationCriteria paginationCriteria = logMapper.toCursorPaginationCriteria(pagination);

        var result = logService.queryLogs(filterOptions, paginationCriteria, search);
        LogConnection connection = logMapper.toLogConnection(result);
        log.debug("Successfully fetched {} logs with cursor-based pagination", 
                 connection.getEdges().size());

        return connection;
    }

    @DgsQuery
    public LogDetails logDetails(
            @InputArgument @NotBlank String ingestDay,
            @InputArgument @NotBlank String toolType,
            @InputArgument @NotBlank String eventType,
            @InputArgument Instant timestamp,
            @InputArgument @NotBlank String toolEventId) {
        
        log.debug("Fetching audit details for ingestDay: {}, toolType: {}, eventType: {}, timestamp: {}, toolEventId: {}",
                 ingestDay, toolType, eventType, timestamp, toolEventId);

        Optional<LogDetails> details = logService.findLogDetails(ingestDay, toolType, eventType, timestamp, toolEventId);
        if (details.isPresent()) {
            log.debug("Successfully fetched audit details for toolEventId: {}", toolEventId);
            return details.get();
        } else {
            log.debug("No audit details found for toolEventId: {}", toolEventId);
            return null;
        }
    }
} 