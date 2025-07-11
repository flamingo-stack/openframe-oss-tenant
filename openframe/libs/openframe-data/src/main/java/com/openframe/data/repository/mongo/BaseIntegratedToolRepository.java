package com.openframe.data.repository.mongo;

/**
 * Base interface defining common integrated tool repository operations.
 * This interface is technology-agnostic and can be implemented by both reactive and non-reactive repositories.
 *
 * @param <T>  The return type wrapper (Optional for blocking, Mono for reactive)
 * @param <B>  The boolean return type (boolean for blocking, Mono<Boolean> for reactive)
 * @param <ID> The ID type (String in our case)
 */
public interface BaseIntegratedToolRepository<T, B, ID> {
    /**
     * Find an integrated tool by its type.
     *
     * @param type The tool type to search for
     * @return The tool wrapped in T (Optional<IntegratedTool> for blocking, Mono<IntegratedTool> for reactive)
     */
    T findByType(String type);
} 