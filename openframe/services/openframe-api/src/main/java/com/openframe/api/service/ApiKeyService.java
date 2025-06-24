package com.openframe.api.service;

import com.openframe.api.dto.ApiKeyResponse;
import com.openframe.api.dto.CreateApiKeyRequest;
import com.openframe.api.dto.CreateApiKeyResponse;
import com.openframe.api.dto.UpdateApiKeyRequest;
import com.openframe.core.exception.ApiKeyException;
import com.openframe.core.model.ApiKey;
import com.openframe.data.repository.mongo.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyService {
    
    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();
    
    private static final String KEY_ID_PREFIX = "ak_";
    private static final String SECRET_PREFIX = "sk_";
    private static final int KEY_ID_LENGTH = 16;
    private static final int SECRET_LENGTH = 32;
    
    /**
     * Create a new API key for a user
     */
    public CreateApiKeyResponse createApiKey(String userId, CreateApiKeyRequest request) {
        log.info("Creating API key '{}' for user: {}", request.name(), userId);
        
        try {
            return buildAndSaveApiKey(userId, request.name(), request.description(), request.expiresAt());
        } catch (Exception e) {
            log.error("Failed to create API key for user: {}", userId, e);
            throw new ApiKeyException("Failed to create API key", e);
        }
    }

    /**
     * Get all API keys for a user
     */
    public List<ApiKeyResponse> getApiKeysForUser(String userId) {
        return apiKeyRepository.findByUserId(userId).stream()
            .map(this::mapToResponse)
            .toList();
    }
    
    /**
     * Get API key by ID for a specific user
     */
    public ApiKeyResponse getApiKeyById(String keyId, String userId) {
        ApiKey apiKey = apiKeyRepository.findByIdAndUserIdOrElseThrow(keyId, userId);
        return mapToResponse(apiKey);
    }
    
    /**
     * Update API key
     */
    public ApiKeyResponse updateApiKey(String keyId, String userId, UpdateApiKeyRequest request) {
        ApiKey apiKey = apiKeyRepository.findByIdAndUserIdOrElseThrow(keyId, userId);
        
        if (request.name() != null) {
            apiKey.setName(request.name());
        }
        if (request.description() != null) {
            apiKey.setDescription(request.description());
        }
        if (request.enabled() != null) {
            apiKey.setEnabled(request.enabled());
        }
        if (request.expiresAt() != null) {
            apiKey.setExpiresAt(request.expiresAt());
        }
        
        apiKey.setUpdatedAt(Instant.now());
        
        return mapToResponse(apiKeyRepository.save(apiKey));
    }
    
    /**
     * Delete API key
     */
    public void deleteApiKey(String keyId, String userId) {
        ApiKey apiKey = apiKeyRepository.findByIdAndUserIdOrElseThrow(keyId, userId);
        
        apiKeyRepository.delete(apiKey);
        log.info("Deleted API key: {}", keyId);
    }
    
    /**
     * Disable expired API keys TODO (scheduled task)
     */
    public void disableExpiredKeys() {
        List<ApiKey> expiredKeys = apiKeyRepository.findExpiredKeys(Instant.now());
        
        for (ApiKey key : expiredKeys) {
            key.setEnabled(false);
            key.setUpdatedAt(Instant.now());
            apiKeyRepository.save(key);
            log.info("Disabled expired API key: {}", key.getKeyId());
        }
    }
    
    private void updateLastUsed(String apiKeyId) {
        try {
            apiKeyRepository.updateLastUsed(apiKeyId, Instant.now());
        } catch (Exception e) {
            log.warn("Failed to update last used timestamp for API key: {}", apiKeyId);
        }
    }
    
    private String generateKeyId() {
        byte[] bytes = new byte[KEY_ID_LENGTH / 2];
        secureRandom.nextBytes(bytes);
        return KEY_ID_PREFIX + bytesToHex(bytes);
    }
    
    private String generateSecret() {
        byte[] bytes = new byte[SECRET_LENGTH / 2];
        secureRandom.nextBytes(bytes);
        return bytesToHex(bytes);
    }
    
    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }

    private ApiKeyResponse mapToResponse(ApiKey apiKey) {
        return ApiKeyResponse.builder()
                .id(apiKey.getKeyId())
                .name(apiKey.getName())
                .description(apiKey.getDescription())
                .enabled(apiKey.isEnabled())
                .createdAt(apiKey.getCreatedAt())
                .updatedAt(apiKey.getUpdatedAt())
                .expiresAt(apiKey.getExpiresAt())
                .lastUsed(apiKey.getLastUsed())
                .totalRequests(apiKey.getTotalRequests())
                .successfulRequests(apiKey.getSuccessfulRequests())
                .failedRequests(apiKey.getFailedRequests())
                .build();
    }

    /**
     * Regenerate API key (creates new key with same metadata but new secret)
     */
    public CreateApiKeyResponse regenerateApiKey(String keyId, String userId) {
        log.info("Regenerating API key {} for user: {}", keyId, userId);

        ApiKey existingKey = apiKeyRepository.findByIdAndUserIdOrElseThrow(keyId, userId);

        String name = existingKey.getName();
        String description = existingKey.getDescription();
        Instant expiresAt = existingKey.getExpiresAt();

        apiKeyRepository.delete(existingKey);
        log.debug("Deleted old API key: {}", keyId);

        return buildAndSaveApiKey(userId, name, description, expiresAt);
    }

    /**
     * Build and save API key with generated credentials
     */
    private CreateApiKeyResponse buildAndSaveApiKey(String userId, String name, String description, Instant expiresAt) {
        String keyId = generateKeyId();
        String secret = generateSecret();
        String hashedSecret = passwordEncoder.encode(secret);
        
        log.debug("Generated keyId: {}", keyId);
        log.debug("Generated secret length: {}", secret.length());

        ApiKey apiKey = ApiKey.builder()
            .keyId(keyId)
            .hashedKey(hashedSecret)
            .name(name)
            .description(description)
            .userId(userId)
            .enabled(true)
            .expiresAt(expiresAt)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        
        log.debug("Built API key with keyId: {}", apiKey.getKeyId());

        ApiKey savedKey = apiKeyRepository.save(apiKey);
        log.info("Saved API key with ID: {}", savedKey.getKeyId());

        return new CreateApiKeyResponse(
            mapToResponse(savedKey),
            keyId + "." + SECRET_PREFIX + secret
        );
    }
} 