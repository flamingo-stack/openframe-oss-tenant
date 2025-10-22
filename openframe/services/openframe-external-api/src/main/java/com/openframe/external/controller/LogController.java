package com.openframe.external.controller;

import com.openframe.api.service.LogService;
import com.openframe.core.dto.ErrorResponse;
import com.openframe.external.dto.audit.LogsResponse;
import com.openframe.external.dto.audit.LogFilterResponse;
import com.openframe.external.dto.audit.LogDetailsResponse;
import com.openframe.external.dto.audit.LogFilterCriteria;
import com.openframe.external.dto.shared.PaginationCriteria;
import com.openframe.external.mapper.LogMapper;
import com.openframe.external.exception.LogNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1/logs")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Logs", description = "System log management operations")
public class LogController {

    private final LogService logService;
    private final LogMapper logMapper;

    @Operation(summary = "Get logs", description = "Retrieve logs with optional filtering, search, and pagination")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved logs",
                    content = @Content(schema = @Schema(implementation = LogsResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    @ResponseStatus(OK)
    public LogsResponse getLogs(
            @Parameter(description = "Start date in YYYY-MM-DD format")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date in YYYY-MM-DD format")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Tool types to filter")
            @RequestParam(required = false) List<String> toolTypes,
            @Parameter(description = "Event types to filter")
            @RequestParam(required = false) List<String> eventTypes,
            @Parameter(description = "Severity levels to filter")
            @RequestParam(required = false) List<String> severities,
            @Parameter(description = "Organization IDs to filter by")
            @RequestParam(required = false) List<String> organizationIds,
            @Parameter(description = "Device ID to filter by (exact matching)")
            @RequestParam(required = false) String deviceId,
            @Parameter(description = "Search in log summary and content")
            @RequestParam(required = false) String search,
            @Parameter(description = "Page size (default: 20, max: 100)")
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) Integer limit,
            @Parameter(description = "Cursor for pagination")
            @RequestParam(required = false) String cursor,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting logs - startDate: {}, endDate: {}, toolTypes: {}, eventTypes: {}, severities: {}, organizationIds: {}, deviceId: {}, search: {}, limit: {}, cursor: {} - userId: {}, apiKeyId: {}", 
                startDate, endDate, toolTypes, eventTypes, severities, organizationIds, deviceId, search, limit, cursor, userId, apiKeyId);
        
        LogFilterCriteria filterCriteria = LogFilterCriteria.builder()
                .startDate(startDate)
                .endDate(endDate)
                .toolTypes(toolTypes)
                .eventTypes(eventTypes)
                .severities(severities)
                .organizationIds(organizationIds)
                .deviceId(deviceId)
                .build();
        
        PaginationCriteria paginationCriteria = PaginationCriteria.builder()
                .limit(limit)
                .cursor(cursor)
                .build();
        
        var result = logService.queryLogs(
                logMapper.toLogFilterOptions(filterCriteria), 
                logMapper.toCursorPaginationCriteria(paginationCriteria), 
                search);
        return logMapper.toLogsResponse(result);
    }

    @Operation(summary = "Get log filters", description = "Retrieve available log filter options")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved log filters",
                    content = @Content(schema = @Schema(implementation = LogFilterResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/filters")
    @ResponseStatus(OK)
    public LogFilterResponse getLogFilters(
            @Parameter(description = "Start date in YYYY-MM-DD format")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date in YYYY-MM-DD format")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Tool types to filter")
            @RequestParam(required = false) List<String> toolTypes,
            @Parameter(description = "Event types to filter")
            @RequestParam(required = false) List<String> eventTypes,
            @Parameter(description = "Severity levels to filter")
            @RequestParam(required = false) List<String> severities,
            @Parameter(description = "Organization IDs to filter by")
            @RequestParam(required = false) List<String> organizationIds,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting log filters - startDate: {}, endDate: {}, toolTypes: {}, eventTypes: {}, severities: {}, organizationIds: {} - userId: {}, apiKeyId: {}", 
                startDate, endDate, toolTypes, eventTypes, severities, organizationIds, userId, apiKeyId);
        
        LogFilterCriteria filterCriteria = LogFilterCriteria.builder()
                .startDate(startDate)
                .endDate(endDate)
                .toolTypes(toolTypes)
                .eventTypes(eventTypes)
                .severities(severities)
                .organizationIds(organizationIds)
                .build();
        
        var filters = logService.getLogFilters(
                logMapper.toLogFilterOptions(filterCriteria));
        return logMapper.toLogFilterResponse(filters);
    }

    @Operation(summary = "Get log details", description = "Retrieve detailed information for a specific log entry")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved log details",
                    content = @Content(schema = @Schema(implementation = LogDetailsResponse.class))),
            @ApiResponse(responseCode = "404", description = "Log entry not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/details")
    @ResponseStatus(OK)
    public LogDetailsResponse getLogDetails(
            @Parameter(description = "Ingest day of the log entry", required = true)
            @RequestParam String ingestDay,
            @Parameter(description = "Tool type of the log entry", required = true)
            @RequestParam String toolType,
            @Parameter(description = "Event type of the log entry", required = true)
            @RequestParam String eventType,
            @Parameter(description = "Timestamp of the log entry", required = true)
            @RequestParam java.time.Instant timestamp,
            @Parameter(description = "Tool event ID", required = true)
            @RequestParam String toolEventId,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting log details - ingestDay: {}, toolType: {}, eventType: {}, timestamp: {}, toolEventId: {} - userId: {}, apiKeyId: {}", 
                ingestDay, toolType, eventType, timestamp, toolEventId, userId, apiKeyId);
        
        var logDetails = logService.findLogDetails(ingestDay, toolType, eventType, timestamp, toolEventId)
                .orElseThrow(() -> new LogNotFoundException(
                    String.format("Log not found for toolEventId: %s, ingestDay: %s, toolType: %s, eventType: %s, timestamp: %s",
                        toolEventId, ingestDay, toolType, eventType, timestamp)));
        
        return logMapper.toLogDetailsResponse(logDetails);
    }
}