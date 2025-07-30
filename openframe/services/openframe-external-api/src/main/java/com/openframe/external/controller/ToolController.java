package com.openframe.external.controller;

import com.openframe.api.service.ToolService;
import com.openframe.core.dto.ErrorResponse;
import com.openframe.external.dto.tool.ToolFilterCriteria;
import com.openframe.external.dto.tool.ToolFilterResponse;
import com.openframe.external.dto.tool.ToolsResponse;
import com.openframe.external.mapper.ToolMapper;
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


import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1/tools")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Tools", description = "Integrated tools management operations")
public class ToolController {

    private final ToolService toolService;
    private final ToolMapper toolMapper;

    @Operation(summary = "Get integrated tools", description = "Retrieve integrated tools with optional filtering")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved tools",
                    content = @Content(schema = @Schema(implementation = ToolsResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    @ResponseStatus(OK)
    public ToolsResponse getTools(
            @Parameter(description = "Filter by enabled status")
            @RequestParam(required = false) Boolean enabled,
            @Parameter(description = "Filter by tool type")
            @RequestParam(required = false) String type,
            @Parameter(description = "Search in tool name and description")
            @RequestParam(required = false) String search,
            @Parameter(description = "Filter by category")
            @RequestParam(required = false) String category,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting tools - enabled: {}, type: {}, search: {}, category: {} - userId: {}, apiKeyId: {}", 
                enabled, type, search, category, userId, apiKeyId);

        ToolFilterCriteria filterCriteria = ToolFilterCriteria.builder()
                .enabled(enabled)
                .type(type)
                .category(category)
                .build();

        var result = toolService.queryTools(toolMapper.toToolFilterOptions(filterCriteria), search);
        return toolMapper.toToolsResponse(result);
    }

    @Operation(summary = "Get tool filters", description = "Retrieve available filter options for tools")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved tool filters",
                    content = @Content(schema = @Schema(implementation = ToolFilterResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/filters")
    @ResponseStatus(OK)
    public ToolFilterResponse getToolFilters(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting tool filters - userId: {}, apiKeyId: {}", userId, apiKeyId);

        var filters = toolService.getToolFilters();
        return toolMapper.toToolFilterResponse(filters);
    }
} 