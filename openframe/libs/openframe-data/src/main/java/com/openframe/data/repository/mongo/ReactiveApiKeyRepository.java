package com.openframe.data.repository.mongo;

import com.openframe.core.model.ApiKey;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Repository
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public interface ReactiveApiKeyRepository extends ReactiveMongoRepository<ApiKey, String>, BaseApiKeyRepository<Mono<ApiKey>, Mono<Boolean>, Flux<ApiKey>, String> {

    @Override
    @Query("{ '_id': ?0, 'userId': ?1 }")
    Mono<ApiKey> findByIdAndUserId(String keyId, String userId);

    @Override
    Flux<ApiKey> findByUserId(String userId);

    @Override
    @Query("{ 'expiresAt': { $lt: ?0 }, 'enabled': true }")
    Flux<ApiKey> findExpiredKeys(Instant currentTime);
} 