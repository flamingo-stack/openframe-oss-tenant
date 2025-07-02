package com.openframe.data.repository.mongo;

import com.openframe.core.exception.ApiKeyNotFoundException;
import com.openframe.core.model.ApiKey;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
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

    @Query("{ 'expiresAt': { $lt: ?0 }, 'enabled': true }")
    List<ApiKey> findExpiredKeys(Instant currentTime);
} 