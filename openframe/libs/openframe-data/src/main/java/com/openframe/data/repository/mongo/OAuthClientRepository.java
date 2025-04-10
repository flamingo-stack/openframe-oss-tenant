package com.openframe.data.repository.mongo;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.openframe.core.model.OAuthClient;

@Repository
public interface OAuthClientRepository extends MongoRepository<OAuthClient, String> {
    Optional<OAuthClient> findByClientId(String clientId);
    Optional<OAuthClient> findByMachineId(String machineId);
} 