package com.openframe.api.controller;

import com.openframe.api.dto.ApiKeyResponse;
import com.openframe.api.dto.CreateApiKeyRequest;
import com.openframe.api.dto.CreateApiKeyResponse;
import com.openframe.api.dto.UpdateApiKeyRequest;
import com.openframe.api.service.ApiKeyService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api-keys")
@RequiredArgsConstructor
public class ApiKeyController {
    
    private final ApiKeyService apiKeyService;
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateApiKeyResponse createApiKey(
            @Valid @RequestBody CreateApiKeyRequest request,
            @RequestHeader("X-User-Id") String userId) {
        
        log.info("Creating API key '{}' for user: {}", request.name(), userId);
        
        return apiKeyService.createApiKey(userId, request);
    }
    
    @GetMapping
    public List<ApiKeyResponse> getApiKeys(@RequestHeader("X-User-Id") String userId) {
        
        log.debug("Retrieving API keys for user: {}", userId);
        
        return apiKeyService.getApiKeysForUser(userId);
    }
    
    @GetMapping("/{keyId}")
    public ResponseEntity<ApiKeyResponse> getApiKey(
            @PathVariable String keyId,
            @RequestHeader("X-User-Id") String userId) {
        
        ApiKeyResponse apiKey = apiKeyService.getApiKeyById(keyId, userId);
        return ResponseEntity.ok(apiKey);
    }
    
    @PutMapping("/{keyId}")
    public ApiKeyResponse updateApiKey(
            @PathVariable String keyId,
            @Valid @RequestBody UpdateApiKeyRequest request,
            @RequestHeader("X-User-Id") String userId) {
        
        log.info("Updating API key {} for user: {}", keyId, userId);
        
        UpdateApiKeyRequest serviceRequest = UpdateApiKeyRequest.builder()
            .name(request.name())
            .description(request.description())
            .enabled(request.enabled())
            .expiresAt(request.expiresAt())
            .build();
        
        return apiKeyService.updateApiKey(keyId, userId, serviceRequest);
    }
    
    @DeleteMapping("/{keyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteApiKey(
            @PathVariable String keyId,
            @RequestHeader("X-User-Id") String userId) {
        
        log.info("Deleting API key {} for user: {}", keyId, userId);
        
        apiKeyService.deleteApiKey(keyId, userId);
    }
    
    @PatchMapping("/{keyId}/toggle")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void toggleApiKey(
            @PathVariable String keyId,
            @RequestParam boolean enabled,
            @RequestHeader("X-User-Id") String userId) {
        
        log.info("Toggling API key {} to {} for user: {}", keyId, enabled, userId);
        
        UpdateApiKeyRequest serviceRequest = UpdateApiKeyRequest.builder()
            .enabled(enabled)
            .build();
        
        apiKeyService.updateApiKey(keyId, userId, serviceRequest);
    }
    
    @PostMapping("/{keyId}/regenerate")
    public CreateApiKeyResponse regenerateApiKey(
            @PathVariable String keyId,
            @RequestHeader("X-User-Id") String userId) {
        
        log.info("Regenerating API key {} for user: {}", keyId, userId);
        
        return apiKeyService.regenerateApiKey(keyId, userId);
    }
} 