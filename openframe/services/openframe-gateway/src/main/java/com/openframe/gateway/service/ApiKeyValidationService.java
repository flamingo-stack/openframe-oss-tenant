package com.openframe.gateway.service;

import com.openframe.core.model.ApiKey;
import com.openframe.data.repository.mongo.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Optional;

/**
 * Service for validating API keys
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyValidationService {
    
    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;
    
    /**
     * Validate API key and return validated key information
     */
    public Mono<ApiKeyValidationResult> validateApiKey(String fullApiKey) {
        return Mono.fromCallable(() -> {
            log.debug("Validating API key");
            
            // Parse the API key format: ak_keyId.sk_secret
            if (!fullApiKey.contains(".sk_")) {
                log.warn("Invalid API key format - missing .sk_ separator");
                return ApiKeyValidationResult.invalid("Invalid API key format");
            }
            
            String[] parts = fullApiKey.split("\\.sk_");
            if (parts.length != 2) {
                log.warn("Invalid API key format - incorrect number of parts");
                return ApiKeyValidationResult.invalid("Invalid API key format");
            }
            
            String keyId = parts[0];
            String secret = parts[1];
            
            if (!keyId.startsWith("ak_")) {
                log.warn("Invalid API key format - keyId doesn't start with ak_");
                return ApiKeyValidationResult.invalid("Invalid API key format");
            }
            
            // Find API key in database
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findById(keyId);
            if (apiKeyOpt.isEmpty()) {
                log.warn("API key not found: {}", keyId);
                return ApiKeyValidationResult.invalid("API key not found");
            }
            
            ApiKey apiKey = apiKeyOpt.get();
            
            // Check if API key is active
            if (!apiKey.isActive()) {
                log.warn("API key is not active: {}", keyId);
                return ApiKeyValidationResult.invalid("API key is not active");
            }
            
            // Verify the secret
            if (!passwordEncoder.matches(secret, apiKey.getHashedKey())) {
                log.warn("Invalid secret for API key: {}", keyId);
                return ApiKeyValidationResult.invalid("Invalid API key secret");
            }
            
            log.debug("API key validation successful for: {}", keyId);
            return ApiKeyValidationResult.valid(apiKey);
        });
    }
    
    /**
     * Update last used timestamp asynchronously
     */
    @Async("apiKeyStatsExecutor")
    public void updateLastUsedAsync(String keyId) {
        try {
            log.debug("Updating lastUsed for API key: {}", keyId);
            apiKeyRepository.updateLastUsed(keyId, Instant.now());
        } catch (Exception e) {
            log.warn("Failed to update lastUsed for API key {}: {}", keyId, e.getMessage());
        }
    }
    
    /**
     * Increment total requests counter asynchronously
     */
    @Async("apiKeyStatsExecutor")
    public void incrementTotalRequestsAsync(String keyId) {
        try {
            log.debug("Incrementing totalRequests for API key: {}", keyId);
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findById(keyId);
            if (apiKeyOpt.isPresent()) {
                ApiKey apiKey = apiKeyOpt.get();
                apiKey.setTotalRequests(apiKey.getTotalRequests() + 1);
                apiKeyRepository.save(apiKey);
            }
        } catch (Exception e) {
            log.warn("Failed to increment totalRequests for API key {}: {}", keyId, e.getMessage());
        }
    }
    
    /**
     * Increment successful requests counter asynchronously
     */
    @Async("apiKeyStatsExecutor")
    public void incrementSuccessfulRequestsAsync(String keyId) {
        try {
            log.debug("Incrementing successfulRequests for API key: {}", keyId);
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findById(keyId);
            if (apiKeyOpt.isPresent()) {
                ApiKey apiKey = apiKeyOpt.get();
                apiKey.setSuccessfulRequests(apiKey.getSuccessfulRequests() + 1);
                apiKeyRepository.save(apiKey);
            }
        } catch (Exception e) {
            log.warn("Failed to increment successfulRequests for API key {}: {}", keyId, e.getMessage());
        }
    }
    
    /**
     * Increment failed requests counter asynchronously
     */
    @Async("apiKeyStatsExecutor")
    public void incrementFailedRequestsAsync(String keyId) {
        try {
            log.debug("Incrementing failedRequests for API key: {}", keyId);
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findById(keyId);
            if (apiKeyOpt.isPresent()) {
                ApiKey apiKey = apiKeyOpt.get();
                apiKey.setFailedRequests(apiKey.getFailedRequests() + 1);
                apiKeyRepository.save(apiKey);
            }
        } catch (Exception e) {
            log.warn("Failed to increment failedRequests for API key {}: {}", keyId, e.getMessage());
        }
    }
    
    /**
     * Result of API key validation
     */
    public static class ApiKeyValidationResult {
        private final boolean valid;
        private final String errorMessage;
        private final ApiKey apiKey;
        
        private ApiKeyValidationResult(boolean valid, String errorMessage, ApiKey apiKey) {
            this.valid = valid;
            this.errorMessage = errorMessage;
            this.apiKey = apiKey;
        }
        
        public static ApiKeyValidationResult valid(ApiKey apiKey) {
            return new ApiKeyValidationResult(true, null, apiKey);
        }
        
        public static ApiKeyValidationResult invalid(String errorMessage) {
            return new ApiKeyValidationResult(false, errorMessage, null);
        }
        
        public boolean isValid() {
            return valid;
        }
        
        public String getErrorMessage() {
            return errorMessage;
        }
        
        public ApiKey getApiKey() {
            return apiKey;
        }
    }
} 