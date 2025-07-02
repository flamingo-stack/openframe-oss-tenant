package com.openframe.external.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/test")
@Tag(name = "Test API", description = "Test endpoints for API key authentication and basic functionality")
public class TestController {
    
    @Operation(
        summary = "Test GET endpoint",
        description = "Simple test endpoint to verify API key authentication and get basic system information"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Success - returns test data with authentication info"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key"),
        @ApiResponse(responseCode = "429", description = "Too Many Requests - rate limit exceeded")
    })
    @GetMapping
    public ResponseEntity<Map<String, Object>> testGet(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {
        
        log.info("External API test endpoint called - userId: {}, apiKeyId: {}", userId, apiKeyId);
        
        return ResponseEntity.ok(Map.of(
            "message", "External API Test Endpoint",
            "timestamp", LocalDateTime.now(),
            "method", "GET",
            "authenticated", userId != null || apiKeyId != null,
            "userId", userId != null ? userId : "N/A",
            "apiKeyId", apiKeyId != null ? apiKeyId : "N/A"
        ));
    }
    
    @Operation(
        summary = "Test POST endpoint",
        description = "Test endpoint that accepts JSON data and returns it back with authentication info"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Success - returns submitted data with authentication info"),
        @ApiResponse(responseCode = "400", description = "Bad Request - invalid JSON format"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing API key"),
        @ApiResponse(responseCode = "429", description = "Too Many Requests - rate limit exceeded")
    })
    @PostMapping
    public ResponseEntity<Map<String, Object>> testPost(
            @Parameter(description = "Optional JSON data to echo back") @RequestBody(required = false) Map<String, Object> body,
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Parameter(hidden = true) @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {
        
        log.info("External API test POST called - userId: {}, apiKeyId: {}, body: {}", userId, apiKeyId, body);
        
        return ResponseEntity.ok(Map.of(
            "message", "External API Test POST Endpoint",
            "timestamp", LocalDateTime.now(),
            "method", "POST",
            "receivedData", body != null ? body : Map.of(),
            "authenticated", userId != null || apiKeyId != null,
            "userId", userId != null ? userId : "N/A",
            "apiKeyId", apiKeyId != null ? apiKeyId : "N/A"
        ));
    }
} 