package com.openframe.data.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.openframe.core.model.OAuthToken;

public interface OAuthTokenRepository extends MongoRepository<OAuthToken, String> {
    OAuthToken findByAccessToken(String accessToken);
    OAuthToken findByRefreshToken(String refreshToken);
} 