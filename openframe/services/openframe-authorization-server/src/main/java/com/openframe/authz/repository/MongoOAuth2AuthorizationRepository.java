package com.openframe.authz.repository;

import com.openframe.authz.document.MongoOAuth2Authorization;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MongoOAuth2AuthorizationRepository extends MongoRepository<MongoOAuth2Authorization, String> {
    Optional<MongoOAuth2Authorization> findByState(String state);

    Optional<MongoOAuth2Authorization> findByAuthorizationCodeValue(String code);

    Optional<MongoOAuth2Authorization> findByAccessTokenValue(String accessToken);

    Optional<MongoOAuth2Authorization> findByRefreshTokenValue(String refreshToken);
}
