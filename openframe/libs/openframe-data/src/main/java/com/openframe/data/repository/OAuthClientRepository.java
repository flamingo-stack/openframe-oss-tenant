package com.openframe.data.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.openframe.core.model.OAuthClient;

public interface OAuthClientRepository extends MongoRepository<OAuthClient, String> {
    OAuthClient findByClientId(String clientId);
    Optional<OAuthClient> findByMachineId(String machineId);
} 