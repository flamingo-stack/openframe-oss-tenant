package com.openframe.external.controller;

import com.openframe.api.dto.organization.*;
import com.openframe.api.mapper.OrganizationMapper;
import com.openframe.api.service.OrganizationCommandService;
import com.openframe.api.service.OrganizationQueryService;
import com.openframe.core.dto.ErrorResponse;
import com.openframe.data.exception.OrganizationHasMachinesException;
import com.openframe.data.service.OrganizationService;
import com.openframe.external.dto.organization.OrganizationsResponse;
import com.openframe.external.exception.OrganizationNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.*;

/**
 * External REST API Controller for Organization operations.
 * Provides full CRUD access to organization data for external integrations.
 */

@RestController
@RequestMapping("/api/v1/organizations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Organizations API v1", description = "Organization management endpoints")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final OrganizationQueryService organizationQueryService;
    private final OrganizationCommandService organizationCommandService;
    private final OrganizationMapper organizationMapper;

    @Operation(
            summary = "Get list of organizations",
            description = "Retrieve a list of organizations with optional filtering and search"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved organizations",
                    content = @Content(schema = @Schema(implementation = OrganizationsResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    @ResponseStatus(OK)
    public OrganizationsResponse getOrganizations(
            @Parameter(description = "Filter by category")
            @RequestParam(required = false) String category,

            @Parameter(description = "Minimum number of employees")
            @RequestParam(required = false) Integer minEmployees,

            @Parameter(description = "Maximum number of employees")
            @RequestParam(required = false) Integer maxEmployees,

            @Parameter(description = "Filter by active contract status")
            @RequestParam(required = false) Boolean hasActiveContract,

            @Parameter(description = "Search query for organization name and category")
            @RequestParam(required = false) String search,

            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting organizations - category: {}, minEmployees: {}, maxEmployees: {}, hasActiveContract: {}, search: {} - userId: {}, apiKeyId: {}",
                category, minEmployees, maxEmployees, hasActiveContract, search, userId, apiKeyId);

        // Build filter options directly from query parameters
        OrganizationFilterOptions filterOptions = OrganizationFilterOptions.builder()
                .category(category)
                .minEmployees(minEmployees)
                .maxEmployees(maxEmployees)
                .hasActiveContract(hasActiveContract)
                .build();

        OrganizationList result = organizationQueryService.queryOrganizations(filterOptions, search);

        // Convert to external API response format
        var responses = result.getOrganizations().stream()
                .map(organizationMapper::toResponse)
                .toList();

        return OrganizationsResponse.builder()
                .organizations(responses)
                .total(responses.size())
                .build();
    }

    @Operation(
            summary = "Get organization by ID",
            description = "Retrieve a single organization by its database ID"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved organization",
                    content = @Content(schema = @Schema(implementation = OrganizationResponse.class))),
            @ApiResponse(responseCode = "404", description = "Organization not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    @ResponseStatus(OK)
    public OrganizationResponse getOrganizationById(
            @Parameter(description = "Organization database ID", required = true)
            @PathVariable String id,

            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting organization by ID: {} - userId: {}, apiKeyId: {}", id, userId, apiKeyId);

        var organization = organizationService.getOrganizationById(id)
                .orElseThrow(() -> new OrganizationNotFoundException(id));

        return organizationMapper.toResponse(organization);
    }

    @Operation(
            summary = "Get organization by organizationId",
            description = "Retrieve a single organization by its business identifier (organizationId)"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved organization",
                    content = @Content(schema = @Schema(implementation = OrganizationResponse.class))),
            @ApiResponse(responseCode = "404", description = "Organization not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/by-organization-id/{organizationId}")
    @ResponseStatus(OK)
    public OrganizationResponse getOrganizationByOrganizationId(
            @Parameter(description = "Organization business identifier", required = true)
            @PathVariable String organizationId,

            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Getting organization by organizationId: {} - userId: {}, apiKeyId: {}", organizationId, userId, apiKeyId);

        var organization = organizationService.getOrganizationByOrganizationId(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));

        return organizationMapper.toResponse(organization);
    }

    @Operation(
            summary = "Create a new organization",
            description = "Create a new organization with the provided information"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Organization created successfully",
                    content = @Content(schema = @Schema(implementation = OrganizationResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request body or validation error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Organization with this organizationId already exists",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping
    @ResponseStatus(CREATED)
    public OrganizationResponse createOrganization(
            @Parameter(description = "Organization data to create")
            @Valid @RequestBody CreateOrganizationRequest request,

            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Creating organization: {} - userId: {}, apiKeyId: {}", request.name(), userId, apiKeyId);

        var created = organizationCommandService.createOrganization(request);
        return organizationMapper.toResponse(created);
    }

    @Operation(
            summary = "Update an existing organization",
            description = "Update an existing organization by ID with the provided information"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Organization updated successfully",
                    content = @Content(schema = @Schema(implementation = OrganizationResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request body or validation error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Organization not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping("/{id}")
    @ResponseStatus(OK)
    public OrganizationResponse updateOrganization(
            @Parameter(description = "Organization database ID", required = true)
            @PathVariable String id,

            @Parameter(description = "Updated organization data")
            @Valid @RequestBody UpdateOrganizationRequest request,

            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Updating organization: {} - userId: {}, apiKeyId: {}", id, userId, apiKeyId);

        try {
            var updated = organizationCommandService.updateOrganization(id, request);
            return organizationMapper.toResponse(updated);
        } catch (IllegalArgumentException e) {
            throw new OrganizationNotFoundException(id);
        }
    }

    @Operation(
            summary = "Delete an organization",
            description = "Delete an organization by ID. Cannot delete if organization has associated machines."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Organization deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Organization not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Cannot delete organization with associated machines",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(NO_CONTENT)
    public void deleteOrganization(
            @Parameter(description = "Organization database ID", required = true)
            @PathVariable String id,

            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {

        log.info("Deleting organization: {} - userId: {}, apiKeyId: {}", id, userId, apiKeyId);

        try {
            organizationCommandService.deleteOrganization(id);
        } catch (OrganizationHasMachinesException e) {
            throw new ResponseStatusException(CONFLICT, e.getMessage());
        } catch (IllegalArgumentException e) {
            throw new OrganizationNotFoundException(id);
        }
    }
}
