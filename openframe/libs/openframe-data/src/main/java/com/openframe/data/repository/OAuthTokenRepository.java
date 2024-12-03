package com.openframe.data.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.openframe.core.model.OAuthToken;

public interface OAuthTokenRepository extends MongoRepository<OAuthToken, String> {
    Optional<OAuthToken> findByAccessToken(String accessToken);
    Optional<OAuthToken> findByRefreshToken(String refreshToken);
} 