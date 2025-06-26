package com.openframe.data.repository.mongo;

import com.openframe.core.exception.ApiKeyNotFoundException;
import com.openframe.core.model.ApiKey;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApiKeyRepository extends MongoRepository<ApiKey, String> {

    @Query("{ '_id': ?0, 'userId': ?1 }")
    Optional<ApiKey> findByIdAndUserId(String keyId, String userId);

    default ApiKey findByIdAndUserIdOrElseThrow(String keyId, String userId) {
        return findByIdAndUserId(keyId, userId)
            .orElseThrow(() -> new ApiKeyNotFoundException(keyId, userId));
    }

    List<ApiKey> findByUserId(String userId);

    List<ApiKey> findByUserIdAndEnabled(String userId, boolean enabled);

    List<ApiKey> findByExpiresAtBefore(Instant expiresAt);

    @Query("{ 'expiresAt': { $lt: ?0 }, 'enabled': true }")
    List<ApiKey> findExpiredKeys(Instant currentTime);

    long countByUserId(String userId);

    long countByUserIdAndEnabled(String userId, boolean enabled);

    @Query("{ '_id': ?0 }")
    @Update("{ '$set': { 'lastUsed': ?1 } }")
    void updateLastUsed(String keyId, Instant lastUsed);

    @Query("{ 'roles': { $in: [?0] } }")
    List<ApiKey> findByRole(String role);

    @Query("{ 'scopes': { $in: [?0] } }")
    List<ApiKey> findByScope(String scope);
} 