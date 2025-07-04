package com.openframe.data.repository.mongo;

import java.time.Instant;

/**
 * Base interface defining common API key repository operations.
 * This interface is technology-agnostic and can be implemented by both reactive and non-reactive repositories.
 *
 * @param <T>  The return type wrapper (Optional for blocking, Mono for reactive)
 * @param <B>  The boolean return type (boolean for blocking, Mono<Boolean> for reactive)
 * @param <L>  The list return type (List for blocking, Flux for reactive)
 * @param <ID> The ID type (String in our case)
 */
public interface BaseApiKeyRepository<T, B, L, ID> {
    /**
     * Find an API key by ID and user ID.
     *
     * @param keyId  The API key ID
     * @param userId The user ID
     * @return The API key wrapped in T (Optional<ApiKey> for blocking, Mono<ApiKey> for reactive)
     */
    T findByIdAndUserId(String keyId, String userId);

    /**
     * Find all API keys for a user.
     *
     * @param userId The user ID
     * @return List of API keys wrapped in L (List<ApiKey> for blocking, Flux<ApiKey> for reactive)
     */
    L findByUserId(String userId);

    /**
     * Find expired API keys.
     *
     * @param currentTime The current time to compare against
     * @return List of expired API keys wrapped in L (List<ApiKey> for blocking, Flux<ApiKey> for reactive)
     */
    L findExpiredKeys(Instant currentTime);
} 