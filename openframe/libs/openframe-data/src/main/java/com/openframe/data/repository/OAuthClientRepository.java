package com.openframe.data.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.openframe.core.model.OAuthClient;

public interface OAuthClientRepository extends MongoRepository<OAuthClient, String> {
    OAuthClient findByClientId(String clientId);
} 