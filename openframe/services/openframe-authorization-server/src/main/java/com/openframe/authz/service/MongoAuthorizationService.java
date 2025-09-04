package com.openframe.authz.service;

import com.openframe.data.document.oauth.MongoOAuth2Authorization;
import com.openframe.data.repository.oauth.MongoOAuth2AuthorizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MongoAuthorizationService implements OAuth2AuthorizationService {
    private final MongoOAuth2AuthorizationRepository repository;
    private final RegisteredClientRepository registeredClientRepository;

    private static final OAuth2TokenType AUTH_CODE = new OAuth2TokenType("code");

    @Override
    public void save(OAuth2Authorization authorization) {
        log.debug("Saving authorization: {}", authorization.getId());

        // Debug logging for PKCE parameters before save
        OAuth2AuthorizationRequest request = authorization.getAttribute(OAuth2AuthorizationRequest.class.getName());
        if (request != null) {
            log.debug("PKCE in request before save: {}", request.getAdditionalParameters());
        }

        OAuth2Authorization.Token<OAuth2AuthorizationCode> code = authorization.getToken(OAuth2AuthorizationCode.class);
        if (code != null) {
            log.debug("PKCE in code metadata before save: {}", code.getMetadata());
        }

        MongoOAuth2Authorization entity = MongoAuthorizationMapper.toEntity(authorization);
        repository.save(entity);

        // Verify PKCE parameters after mapping
        if (entity.getArAdditional() != null) {
            log.debug("PKCE in entity additional params: {}", entity.getArAdditional());
        }
        if (entity.getAuthorizationCodeMetadata() != null) {
            log.debug("PKCE in entity code metadata: {}", entity.getAuthorizationCodeMetadata());
        }
    }

    @Override
    public void remove(OAuth2Authorization authorization) {
        repository.deleteById(authorization.getId());
    }

    @Override
    public OAuth2Authorization findById(String id) {
        return repository.findById(id)
                .map(e -> MongoAuthorizationMapper.toDomain(e, registeredClientRepository))
                .orElse(null);
    }

    @Override
    public OAuth2Authorization findByToken(String token, OAuth2TokenType tokenType) {
        log.debug("Finding authorization by token: {}, type: {}", token, tokenType);

        Optional<MongoOAuth2Authorization> found;
        if (tokenType == null) {
            found = repository.findByAccessTokenValue(token)
                    .or(() -> repository.findByRefreshTokenValue(token))
                    .or(() -> repository.findByAuthorizationCodeValue(token))
                    .or(() -> repository.findByState(token));
        } else if (OAuth2TokenType.ACCESS_TOKEN.equals(tokenType)) {
            found = repository.findByAccessTokenValue(token);
        } else if (OAuth2TokenType.REFRESH_TOKEN.equals(tokenType)) {
            found = repository.findByRefreshTokenValue(token);
        } else if (AUTH_CODE.equals(tokenType)) {
            found = repository.findByAuthorizationCodeValue(token);
        } else {
            found = Optional.empty();
        }

        return found.map(entity -> {
            OAuth2Authorization auth = MongoAuthorizationMapper.toDomain(entity, registeredClientRepository);

            // Debug logging for PKCE parameters
            OAuth2AuthorizationRequest request = auth.getAttribute(OAuth2AuthorizationRequest.class.getName());
            if (request != null) {
                log.debug("PKCE in request: {}", request.getAdditionalParameters());
            }

            OAuth2Authorization.Token<OAuth2AuthorizationCode> code = auth.getToken(OAuth2AuthorizationCode.class);
            if (code != null) {
                log.debug("PKCE in code metadata: {}", code.getMetadata());
            }

            return auth;
        }).orElse(null);
    }
}


