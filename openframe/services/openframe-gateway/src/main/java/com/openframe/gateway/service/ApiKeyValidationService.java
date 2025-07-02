package com.openframe.gateway.service;

import com.openframe.core.model.ApiKey;
import com.openframe.data.repository.mongo.ApiKeyRepository;
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
 * Statistics are handled by ApiKeyStatsDataService for better separation of concerns
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyValidationService {
    
    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApiKeyStatsDataService apiKeyStatsDataService;
    
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
            
            ParsedApiKey parsed = parseApiKey(fullApiKey);
            if (!parsed.valid()) {
                log.warn("Invalid API key format: {}", parsed.errorMessage());
                return ApiKeyValidationResult.invalid(parsed.errorMessage());
            }

            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findById(parsed.keyId());
            if (apiKeyOpt.isEmpty()) {
                log.warn("API key not found: {}", parsed.keyId());
                return ApiKeyValidationResult.invalid("API key not found");
            }
            
            ApiKey apiKey = apiKeyOpt.get();
            
            if (!apiKey.isActive()) {
                log.warn("API key is not active or expired: {}", parsed.keyId());
                return ApiKeyValidationResult.invalid("API key is not active or expired");
            }

            if (!passwordEncoder.matches(parsed.secret(), apiKey.getHashedKey())) {
                log.warn("Invalid secret for API key: {}", parsed.keyId());
                apiKeyStatsDataService.incrementFailed(parsed.keyId());
                return ApiKeyValidationResult.invalid("Invalid API key secret");
            }

            log.debug("API key validation successful for: {}", parsed.keyId());

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

        apiKeyStatsDataService.incrementSuccessful(keyId);
    }
    
    /**
     * Record failed request
     * 
     * @param keyId API key identifier
     */
    public void recordFailedRequest(String keyId) {
        log.debug("Recording failed request for API key: {}", keyId);

        apiKeyStatsDataService.incrementFailed(keyId);
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

        if (!fullApiKey.contains(SECRET_SEPARATOR)) {
            return ParsedApiKey.invalid("Invalid API key format - missing secret separator");
        }

        String[] parts = fullApiKey.split("\\" + SECRET_SEPARATOR);
        if (parts.length != 2) {
            return ParsedApiKey.invalid("Invalid API key format - incorrect structure");
        }
        
        String keyId = parts[0];
        String secret = parts[1];

        if (!keyId.startsWith(API_KEY_PREFIX)) {
            return ParsedApiKey.invalid("Invalid API key format - incorrect prefix");
        }

        if (keyId.length() < API_KEY_PREFIX.length() + 8) {
            return ParsedApiKey.invalid("Invalid API key format - keyId too short");
        }

        if (secret.length() < 16) {
            return ParsedApiKey.invalid("Invalid API key format - secret too short");
        }
        
        return ParsedApiKey.valid(keyId, secret);
    }

    /**
     * Internal class for parsed API key components
     */
    private record ParsedApiKey(boolean valid, String errorMessage, String keyId, String secret) {

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
    }
} 