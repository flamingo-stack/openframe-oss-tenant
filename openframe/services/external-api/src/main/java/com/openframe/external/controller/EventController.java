package com.openframe.external.controller;

import com.openframe.api.service.EventService;
import com.openframe.core.dto.ErrorResponse;
import com.openframe.core.model.Event;
import com.openframe.external.dto.EventResponse;
import com.openframe.external.dto.EventsResponse;
import com.openframe.external.exception.EventNotFoundException;
import com.openframe.external.mapper.EventMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Events", description = "Event management operations")
public class EventController {

    private final EventService eventService;
    private final EventMapper eventMapper;

    @Operation(summary = "Get events", description = "Retrieve events with optional filtering by user and time range")
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
            @Parameter(description = "User ID to filter events")
            @RequestParam(required = false) String userId,
            @Parameter(description = "Start time in ISO format (e.g., 2023-01-01T00:00:00Z)")
            @RequestParam(required = false) String from,
            @Parameter(description = "End time in ISO format (e.g., 2023-12-31T23:59:59Z)")
            @RequestParam(required = false) String to,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String requestUserId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting events - userId: {}, from: {}, to: {} - requestUserId: {}, apiKeyId: {}", 
                userId, from, to, requestUserId, apiKeyId);

        Instant fromInstant = from != null ? Instant.parse(from) : null;
        Instant toInstant = to != null ? Instant.parse(to) : null;

        List<Event> events = eventService.getEvents(userId, fromInstant, toInstant);
        List<EventResponse> eventResponses = eventMapper.toEventResponseList(events);

        return EventsResponse.builder()
                .events(eventResponses)
                .total(eventResponses.size())
                .build();
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

        Event event = eventService.getEventById(id)
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

    @Operation(summary = "Delete event", description = "Delete an event by ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Event deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Event not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(NO_CONTENT)
    public void deleteEvent(
            @Parameter(description = "Event ID")
            @PathVariable String id,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Deleting event with ID: {} - userId: {}, apiKeyId: {}", id, userId, apiKeyId);

        eventService.getEventById(id)
                .orElseThrow(() -> new EventNotFoundException("Event not found with ID: " + id));

        eventService.deleteEvent(id);
    }
} 