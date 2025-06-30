package com.openframe.gateway.service;

import com.openframe.core.model.ApiKey;
import com.openframe.data.repository.mongo.ApiKeyRepository;
import com.openframe.gateway.model.ApiKeyStatsType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.Optional;

/**
 * Clean, focused service for API key validation only
 * 
 * Responsibilities:
 * - Parse and validate API key format
 * - Verify API key existence and status
 * - Authenticate API key secret
 * - Return validation results
 * 
 * Statistics are handled by ApiKeyStatsService for better separation of concerns
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyValidationService {
    
    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApiKeyStatsService statsService;
    
    private static final String API_KEY_PREFIX = "ak_";
    private static final String SECRET_SEPARATOR = ".sk_";
    
    /**
     * Validate API key and update statistics
     * 
     * @param fullApiKey Full API key in format: ak_{keyId}.sk_{secret}
     * @return Mono<ApiKeyValidationResult> containing validation result
     */
    public Mono<ApiKeyValidationResult> validateApiKey(String fullApiKey) {
        return Mono.fromCallable(() -> {
            log.debug("Validating API key format and credentials");
            
            // Parse API key format
            ParsedApiKey parsed = parseApiKey(fullApiKey);
            if (!parsed.isValid()) {
                log.warn("Invalid API key format: {}", parsed.getErrorMessage());
                return ApiKeyValidationResult.invalid(parsed.getErrorMessage());
            }
            
            // Find API key in database
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findById(parsed.getKeyId());
            if (apiKeyOpt.isEmpty()) {
                log.warn("API key not found: {}", parsed.getKeyId());
                return ApiKeyValidationResult.invalid("API key not found");
            }
            
            ApiKey apiKey = apiKeyOpt.get();
            
            // Check if API key is active
            if (!apiKey.isActive()) {
                log.warn("API key is not active: {}", parsed.getKeyId());
                return ApiKeyValidationResult.invalid("API key is not active or expired");
            }
            
            // Verify the secret
            if (!passwordEncoder.matches(parsed.getSecret(), apiKey.getHashedKey())) {
                log.warn("Invalid secret for API key: {}", parsed.getKeyId());
                // Record failed attempt
                statsService.incrementCounter(parsed.getKeyId(), ApiKeyStatsType.FAILED_REQUESTS)
                    .subscribe();
                return ApiKeyValidationResult.invalid("Invalid API key secret");
            }
            
            log.debug("API key validation successful for: {}", parsed.getKeyId());
            
            // Update statistics asynchronously (non-blocking)
            updateApiKeyStatistics(parsed.getKeyId());
            
            return ApiKeyValidationResult.valid(apiKey);
        });
    }
    
    /**
     * Record successful request and update last used timestamp
     * 
     * @param keyId API key identifier
     */
    public void recordSuccessfulRequest(String keyId) {
        log.debug("Recording successful request for API key: {}", keyId);
        
        // Update both counters and lastUsed timestamp
        statsService.incrementCounter(keyId, ApiKeyStatsType.SUCCESSFUL_REQUESTS).subscribe();
        statsService.updateLastUsed(keyId).subscribe();
    }
    
    /**
     * Record failed request
     * 
     * @param keyId API key identifier
     */
    public void recordFailedRequest(String keyId) {
        log.debug("Recording failed request for API key: {}", keyId);
        
        statsService.incrementCounter(keyId, ApiKeyStatsType.FAILED_REQUESTS).subscribe();
    }
    
    /**
     * Update API key statistics asynchronously (called after successful validation)
     * 
     * @param keyId API key identifier
     */
    private void updateApiKeyStatistics(String keyId) {
        // Increment total requests and update last used
        statsService.incrementCounter(keyId, ApiKeyStatsType.TOTAL_REQUESTS).subscribe();
        statsService.updateLastUsed(keyId).subscribe();
    }
    
    /**
     * Parse API key format: ak_{keyId}.sk_{secret}
     * 
     * @param fullApiKey Full API key string
     * @return ParsedApiKey containing keyId, secret, and validation status
     */
    private ParsedApiKey parseApiKey(String fullApiKey) {
        if (fullApiKey == null || fullApiKey.trim().isEmpty()) {
            return ParsedApiKey.invalid("API key is required");
        }
        
        // Check for secret separator
        if (!fullApiKey.contains(SECRET_SEPARATOR)) {
            return ParsedApiKey.invalid("Invalid API key format - missing secret separator");
        }
        
        // Split into keyId and secret parts
        String[] parts = fullApiKey.split("\\" + SECRET_SEPARATOR);
        if (parts.length != 2) {
            return ParsedApiKey.invalid("Invalid API key format - incorrect structure");
        }
        
        String keyId = parts[0];
        String secret = parts[1];
        
        // Validate keyId format
        if (!keyId.startsWith(API_KEY_PREFIX)) {
            return ParsedApiKey.invalid("Invalid API key format - incorrect prefix");
        }
        
        // Validate keyId length (should be ak_ + at least 8 characters)
        if (keyId.length() < API_KEY_PREFIX.length() + 8) {
            return ParsedApiKey.invalid("Invalid API key format - keyId too short");
        }
        
        // Validate secret length (should be at least 16 characters)
        if (secret.length() < 16) {
            return ParsedApiKey.invalid("Invalid API key format - secret too short");
        }
        
        return ParsedApiKey.valid(keyId, secret);
    }
    
    /**
     * Internal class for parsed API key components
     */
    @Getter
    private static class ParsedApiKey {
        private final boolean valid;
        private final String errorMessage;
        private final String keyId;
        private final String secret;
        
        private ParsedApiKey(boolean valid, String errorMessage, String keyId, String secret) {
            this.valid = valid;
            this.errorMessage = errorMessage;
            this.keyId = keyId;
            this.secret = secret;
        }
        
        public static ParsedApiKey valid(String keyId, String secret) {
            return new ParsedApiKey(true, null, keyId, secret);
        }
        
        public static ParsedApiKey invalid(String errorMessage) {
            return new ParsedApiKey(false, errorMessage, null, null);
        }
    }
    
    /**
     * Result of API key validation
     */
    @Getter
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
        
        /**
         * Get API key ID for logging/metrics
         */
        public String getKeyId() {
            return apiKey != null ? apiKey.getKeyId() : null;
        }
    }
} 