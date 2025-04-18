package com.openframe.data.repository.mongo;

/**
 * Base interface defining common user repository operations.
 * This interface is technology-agnostic and can be implemented by both reactive and non-reactive repositories.
 * 
 * @param <T> The return type wrapper (Optional for blocking, Mono for reactive)
 * @param <B> The boolean return type (boolean for blocking, Mono<Boolean> for reactive)
 * @param <ID> The ID type (String in our case)
 */
public interface BaseUserRepository<T, B, ID> {
    /**
     * Find a user by their email address.
     * 
     * @param email The email address to search for
     * @return The user wrapped in T (Optional<User> for blocking, Mono<User> for reactive)
     */
    T findByEmail(String email);

    /**
     * Check if a user exists with the given email.
     * Default implementation provided for reactive repositories.
     * Blocking repositories should override this.
     * 
     * @param email The email to check
     * @return Boolean (boolean for blocking, Mono<Boolean> for reactive)
     */
    B existsByEmail(String email);

    /**
     * Find a user by their reset token.
     * Default implementation provided for reactive repositories.
     * Blocking repositories should override this.
     * 
     * @param resetToken The reset token to search for
     * @return The user wrapped in T (Optional<User> for blocking, Mono<User> for reactive)
     */
    T findByResetToken(String resetToken);
} 