package com.openframe.external.controller;

import com.openframe.api.service.EventService;
import com.openframe.core.dto.ErrorResponse;
import com.openframe.data.document.event.Event;
import com.openframe.external.dto.event.EventFilterCriteria;
import com.openframe.external.dto.event.EventFilterResponse;
import com.openframe.external.dto.event.EventResponse;
import com.openframe.external.dto.event.EventsResponse;
import com.openframe.external.dto.shared.PaginationCriteria;
import com.openframe.external.exception.EventNotFoundException;
import com.openframe.external.mapper.EventMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

import static org.springframework.http.HttpStatus.CREATED;
import static org.springframework.http.HttpStatus.OK;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Events", description = "Event management operations")
public class EventController {

    private final EventService eventService;
    private final EventMapper eventMapper;

    @Operation(summary = "Get events", description = "Retrieve events with cursor-based pagination and optional filtering")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved events",
                    content = @Content(schema = @Schema(implementation = EventsResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    @ResponseStatus(OK)
    public EventsResponse getEvents(
            @Parameter(description = "Comma-separated list of user IDs")
            @RequestParam(required = false) List<String> userIds,
            @Parameter(description = "Comma-separated list of event types")
            @RequestParam(required = false) List<String> eventTypes,
            @Parameter(description = "Start date (YYYY-MM-DD)")
            @RequestParam(required = false) LocalDate startDate,
            @Parameter(description = "End date (YYYY-MM-DD)")
            @RequestParam(required = false) LocalDate endDate,
            @Parameter(description = "Cursor for pagination")
            @RequestParam(required = false) String cursor,
            @Parameter(description = "Number of items to return (default: 20, max: 100)")
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) Integer limit,
            @Parameter(description = "Search term")
            @RequestParam(required = false) String search,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String requestUserId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting events - userIds: {}, eventTypes: {}, startDate: {}, endDate: {}, cursor: {}, limit: {}, search: {} - requestUserId: {}, apiKeyId: {}", 
                userIds, eventTypes, startDate, endDate, cursor, limit, search, requestUserId, apiKeyId);

        EventFilterCriteria filterCriteria = EventFilterCriteria.builder()
                .userIds(userIds)
                .eventTypes(eventTypes)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        PaginationCriteria paginationCriteria = PaginationCriteria.builder()
                .cursor(cursor)
                .limit(limit)
                .build();

        var result = eventService.queryEvents(
                eventMapper.toEventFilterOptions(filterCriteria), 
                eventMapper.toCursorPaginationCriteria(paginationCriteria), 
                search);
        return eventMapper.toEventsResponse(result);
    }

    @Operation(summary = "Get event by ID", description = "Retrieve a specific event by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Event found",
                    content = @Content(schema = @Schema(implementation = EventResponse.class))),
            @ApiResponse(responseCode = "404", description = "Event not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    @ResponseStatus(OK)
    public EventResponse getEvent(
            @Parameter(description = "Event ID")
            @PathVariable String id,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting event by ID: {} - userId: {}, apiKeyId: {}", id, userId, apiKeyId);

        Event event = eventService.findById(id)
                .orElseThrow(() -> new EventNotFoundException("Event not found with ID: " + id));

        return eventMapper.toEventResponse(event);
    }

    @Operation(summary = "Create event", description = "Create a new event")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Event created successfully",
                    content = @Content(schema = @Schema(implementation = EventResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request body",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping
    @ResponseStatus(CREATED)
    public EventResponse createEvent(
            @Parameter(description = "Event to create")
            @RequestBody Event event,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Creating new event - userId: {}, apiKeyId: {}", userId, apiKeyId);

        Event createdEvent = eventService.createEvent(event);
        return eventMapper.toEventResponse(createdEvent);
    }

    @Operation(summary = "Update event", description = "Update an existing event")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Event updated successfully",
                    content = @Content(schema = @Schema(implementation = EventResponse.class))),
            @ApiResponse(responseCode = "404", description = "Event not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request body",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping("/{id}")
    @ResponseStatus(OK)
    public EventResponse updateEvent(
            @Parameter(description = "Event ID")
            @PathVariable String id,
            @Parameter(description = "Updated event data")
            @RequestBody Event event,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Updating event with ID: {} - userId: {}, apiKeyId: {}", id, userId, apiKeyId);

        Event updatedEvent = eventService.updateEvent(id, event);
        return eventMapper.toEventResponse(updatedEvent);
    }

    @Operation(summary = "Get event filters", description = "Retrieve available filter options for events")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved event filters",
                    content = @Content(schema = @Schema(implementation = EventFilterResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/filters")
    @ResponseStatus(OK)
    public EventFilterResponse getEventFilters(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting event filters - userId: {}, apiKeyId: {}", userId, apiKeyId);

        var filters = eventService.getEventFilters();
        return eventMapper.toEventFilterResponse(filters);
    }
} 