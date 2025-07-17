package com.openframe.external.controller;

import com.openframe.api.service.ToolService;
import com.openframe.core.dto.ErrorResponse;
import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolFilter;
import com.openframe.external.dto.ToolResponse;
import com.openframe.external.dto.ToolsResponse;
import com.openframe.external.exception.ToolNotFoundException;
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

import java.util.List;

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
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting tools - enabled: {}, type: {}, search: {} - userId: {}, apiKeyId: {}", 
                enabled, type, search, userId, apiKeyId);

        ToolFilter filter = ToolFilter.builder()
                .enabled(enabled)
                .type(type)
                .search(search)
                .build();

        List<IntegratedTool> tools = toolService.getIntegratedTools(filter);
        List<ToolResponse> toolResponses = toolMapper.toToolResponseList(tools);

        return ToolsResponse.builder()
                .tools(toolResponses)
                .total(toolResponses.size())
                .build();
    }

    @Operation(summary = "Get tool by ID", description = "Retrieve a specific integrated tool by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Tool found",
                    content = @Content(schema = @Schema(implementation = ToolResponse.class))),
            @ApiResponse(responseCode = "404", description = "Tool not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    @ResponseStatus(OK)
    public ToolResponse getTool(
            @Parameter(description = "Tool ID")
            @PathVariable String id,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting tool by ID: {} - userId: {}, apiKeyId: {}", id, userId, apiKeyId);

        IntegratedTool tool = toolService.getIntegratedToolById(id)
                .orElseThrow(() -> new ToolNotFoundException("Tool not found with ID: " + id));

        return toolMapper.toToolResponse(tool);
    }

    @Operation(summary = "Get tool by name", description = "Retrieve a specific integrated tool by its name")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Tool found",
                    content = @Content(schema = @Schema(implementation = ToolResponse.class))),
            @ApiResponse(responseCode = "404", description = "Tool not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/by-name/{name}")
    @ResponseStatus(OK)
    public ToolResponse getToolByName(
            @Parameter(description = "Tool name")
            @PathVariable String name,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting tool by name: {} - userId: {}, apiKeyId: {}", name, userId, apiKeyId);

        IntegratedTool tool = toolService.getIntegratedToolByName(name)
                .orElseThrow(() -> new ToolNotFoundException("Tool not found with name: " + name));

        return toolMapper.toToolResponse(tool);
    }

    @Operation(summary = "Get enabled tools", description = "Retrieve all enabled integrated tools")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved enabled tools",
                    content = @Content(schema = @Schema(implementation = ToolsResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/enabled")
    @ResponseStatus(OK)
    public ToolsResponse getEnabledTools(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting enabled tools - userId: {}, apiKeyId: {}", userId, apiKeyId);

        List<IntegratedTool> tools = toolService.getEnabledTools();
        List<ToolResponse> toolResponses = toolMapper.toToolResponseList(tools);

        return ToolsResponse.builder()
                .tools(toolResponses)
                .total(toolResponses.size())
                .build();
    }

    @Operation(summary = "Create tool", description = "Create a new integrated tool")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Tool created successfully",
                    content = @Content(schema = @Schema(implementation = ToolResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request body",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping
    @ResponseStatus(CREATED)
    public ToolResponse createTool(
            @Parameter(description = "Tool to create")
            @RequestBody IntegratedTool tool,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Creating new tool: {} - userId: {}, apiKeyId: {}", tool.getName(), userId, apiKeyId);

        IntegratedTool createdTool = toolService.createIntegratedTool(tool);
        return toolMapper.toToolResponse(createdTool);
    }

    @Operation(summary = "Update tool", description = "Update an existing integrated tool")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Tool updated successfully",
                    content = @Content(schema = @Schema(implementation = ToolResponse.class))),
            @ApiResponse(responseCode = "404", description = "Tool not found",
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
    public ToolResponse updateTool(
            @Parameter(description = "Tool ID")
            @PathVariable String id,
            @Parameter(description = "Updated tool data")
            @RequestBody IntegratedTool tool,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Updating tool with ID: {} - userId: {}, apiKeyId: {}", id, userId, apiKeyId);

        IntegratedTool updatedTool = toolService.updateIntegratedTool(id, tool);
        return toolMapper.toToolResponse(updatedTool);
    }

    @Operation(summary = "Delete tool", description = "Delete an integrated tool by ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Tool deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Tool not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(NO_CONTENT)
    public void deleteTool(
            @Parameter(description = "Tool ID")
            @PathVariable String id,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Deleting tool with ID: {} - userId: {}, apiKeyId: {}", id, userId, apiKeyId);

        toolService.getIntegratedToolById(id)
                .orElseThrow(() -> new ToolNotFoundException("Tool not found with ID: " + id));

        toolService.deleteIntegratedTool(id);
    }
} 