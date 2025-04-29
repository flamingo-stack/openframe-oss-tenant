package com.openframe.data.repository.mongo;

import com.openframe.core.model.OAuthClient;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveOAuthClientRepository extends ReactiveMongoRepository<OAuthClient, String> {

    Mono<OAuthClient> findByClientId(String clientId);

}
