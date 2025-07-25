package com.openframe.external.controller;

import com.openframe.external.service.RestProxyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/tools")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Integration API", description = "Integration endpoints for external tools")
public class IntegrationController {

    private final RestProxyService restProxyService;

    @Operation(
        summary = "Proxy API request to integrated tool",
        description = "Proxy any HTTP request to the specified integrated tool"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Request proxied successfully"),
        @ApiResponse(responseCode = "400", description = "Bad request or tool error"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key"),
        @ApiResponse(responseCode = "404", description = "Tool not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @RequestMapping(
            value = "{toolId}/**",
            method = {
                    RequestMethod.GET,
                    RequestMethod.POST,
                    RequestMethod.PUT,
                    RequestMethod.PATCH,
                    RequestMethod.DELETE,
                    RequestMethod.OPTIONS
            })
    public ResponseEntity<String> proxyApiRequest(
            @Parameter(description = "Tool identifier") @PathVariable String toolId,
            HttpServletRequest request,
            @Parameter(description = "Request body (for POST/PUT/PATCH requests)") @RequestBody(required = false) String body,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {
        
        String path = request.getRequestURI();
        String method = request.getMethod();
        log.info("Proxying api request for tool: {}, path: {}, method: {} - userId: {}, apiKeyId: {}", 
                toolId, path, method, userId, apiKeyId);
        try {
            return restProxyService.proxyApiRequest(toolId, request, body);
        } catch (Exception e) {
            log.error("Failed to proxy request for tool: {}, path: {}", toolId, path, e);
            return ResponseEntity.internalServerError().body("Internal server error: " + e.getMessage());
        }
    }
} 