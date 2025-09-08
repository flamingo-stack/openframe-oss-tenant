package com.openframe.api.service;

import com.openframe.api.dto.audit.*;
import com.openframe.api.dto.shared.CursorPageInfo;
import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.data.document.event.LogProjection;
import com.openframe.data.model.cassandra.UnifiedLogEvent;
import com.openframe.data.repository.cassandra.UnifiedLogEventRepository;
import com.openframe.data.repository.pinot.PinotLogRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
@AllArgsConstructor
public class LogService {

    private final PinotLogRepository pinotLogRepository;
    private final UnifiedLogEventRepository unifiedLogEventRepository;


    public LogQueryResult queryLogs(LogFilterOptions filter, CursorPaginationCriteria paginationCriteria, String search) {
        CursorPaginationCriteria normalizedCriteria = paginationCriteria.normalize();
        
        log.debug("Querying logs with filter: {}, pagination: {}, search: {}", 
                 filter, normalizedCriteria, search);
        
        LocalDate startDate = filter.getStartDate();
        LocalDate endDate = filter.getEndDate();
        List<String> toolTypes = filter.getToolTypes();
        List<String> eventTypes = filter.getEventTypes();
        List<String> severities = filter.getSeverities();
        List<LogProjection> logs;
        
        String cursor = normalizedCriteria.getCursor();
        int limit = normalizedCriteria.getLimit();
        
        if (search != null && !search.trim().isEmpty()) {
            log.debug("Using search functionality with term: {}", search);
            logs = pinotLogRepository.searchLogs(
                startDate, endDate,
                toolTypes, eventTypes, severities,
                search, cursor, limit);
        } else {
            log.debug("Using exact field filtering");
            logs = pinotLogRepository.findLogs(
                startDate, endDate,
                toolTypes, eventTypes, severities,
                cursor, limit);
        }
        
        log.debug("Retrieved {} logs from Pinot", logs != null ? logs.size() : 0);
        
        LogQueryResult result = buildLogQueryResult(logs, cursor, limit);
        
        log.debug("Successfully built result with {} events", result.getEvents().size());
        return result;
    }

    public Optional<LogDetails> findLogDetails(String ingestDay, String toolType, String eventType, 
                                            Instant timestamp, String toolEventId) {
        log.debug("Finding log details for ingestDay: {}, toolType: {}, eventType: {}, timestamp: {}, toolEventId: {}",
                 ingestDay, toolType, eventType, timestamp, toolEventId);
        
        UnifiedLogEvent.UnifiedLogEventKey key = new UnifiedLogEvent.UnifiedLogEventKey();
        key.setIngestDay(ingestDay);
        key.setToolType(toolType);
        key.setEventType(eventType);
        key.setEventTimestamp(timestamp);
        key.setToolEventId(toolEventId);
        
        Optional<UnifiedLogEvent> logEvent = unifiedLogEventRepository.findById(key);
        
        if (logEvent.isPresent()) {
            LogDetails details = mapToLogDetails(logEvent.get());
            log.debug("Successfully retrieved audit details");
            return Optional.of(details);
        } else {
            log.debug("Log details not found");
            return Optional.empty();
        }
    }

    public LogFilters getLogFilters(LogFilterOptions filters) {
        log.debug("Getting log filters with filter: {}", filters);
        LocalDate startDate = filters.getStartDate();
        LocalDate endDate = filters.getEndDate();
        List<String> toolTypes = filters.getToolTypes();
        List<String> eventTypes = filters.getEventTypes();
        List<String> severities = filters.getSeverities();
        
        List<String> toolTypeOptions = pinotLogRepository.getToolTypeOptions(
            startDate, endDate, 
            toolTypes, eventTypes, severities);
        
        List<String> eventTypeOptions = pinotLogRepository.getEventTypeOptions(
            startDate, endDate, 
            toolTypes, eventTypes, severities);
        
        List<String> severityOptions = pinotLogRepository.getSeverityOptions(
            startDate, endDate, 
            toolTypes, eventTypes, severities);

        return LogFilters.builder()
            .toolTypes(toolTypeOptions)
            .eventTypes(eventTypeOptions)
            .severities(severityOptions)
            .build();
    }



    private LogQueryResult buildLogQueryResult(List<LogProjection> logs, String cursor, int limit) {
        if (logs == null) {
            logs = new ArrayList<>();
        }
        List<LogEvent> events = logs.stream()
            .map(this::mapToLogEvent)
            .collect(Collectors.toList());

        CursorPageInfo pageInfo = CursorPageInfo.builder()
            .hasNextPage(logs.size() == limit)
            .hasPreviousPage(cursor != null)
            .startCursor(events.isEmpty() ? null : createLogCursor(events.getFirst()))
            .endCursor(events.isEmpty() ? null : createLogCursor(events.getLast()))
            .build();

        return LogQueryResult.builder()
            .events(events)
            .pageInfo(pageInfo)
            .build();
    }
    
    private String createLogCursor(LogEvent logEvent) {
        if (logEvent == null || logEvent.getTimestamp() == null) {
            return null;
        }
        return logEvent.getTimestamp().toEpochMilli() + "_" + logEvent.getToolEventId();
    }

    private LogEvent mapToLogEvent(LogProjection log) {
        return LogEvent.builder()
            .toolEventId(log.toolEventId)
            .ingestDay(log.ingestDay)
            .timestamp(log.eventTimestamp)
            .toolType(log.toolType)
            .eventType(log.eventType)
            .severity(log.severity)
            .summary(log.summary)
            .userId(log.userId)
            .deviceId(log.deviceId)
            .build();
    }

    private LogDetails mapToLogDetails(UnifiedLogEvent logEvent) {
        return LogDetails.builder()
                .toolEventId(logEvent.getKey().getToolEventId())
                .timestamp(logEvent.getKey().getEventTimestamp())
                .toolType(logEvent.getKey().getToolType())
                .eventType(logEvent.getKey().getEventType())
                .ingestDay(logEvent.getKey().getIngestDay())
                .severity(logEvent.getSeverity())
                .message(logEvent.getMessage())
                .details(convertDetailsToString(logEvent.getDetails()))
                .userId(logEvent.getUserId())
                .deviceId(logEvent.getDeviceId())
                .summary(logEvent.getMessage())
                .build();
    }

    private String convertDetailsToString(java.util.Map<String, String> details) {
        if (details == null || details.isEmpty()) {
            return null;
        }
        return details.entrySet().stream()
            .map(entry -> "\"" + entry.getKey() + "\": \"" + entry.getValue() + "\"")
            .collect(Collectors.joining(", ", "{", "}"));
    }
}
