package com.openframe.data.repository.mongo;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.openframe.core.model.OAuthToken;

@Repository
public interface OAuthTokenRepository extends MongoRepository<OAuthToken, String> {
    Optional<OAuthToken> findByAccessToken(String accessToken);
    Optional<OAuthToken> findByRefreshToken(String refreshToken);
} 