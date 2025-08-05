package com.openframe.authz.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataRetrievalFailureException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.endpoint.OidcParameterNames;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;

@RequiredArgsConstructor
public class MongoOAuth2AuthorizationService implements OAuth2AuthorizationService {

    private final MongoTemplate mongoTemplate;
    private final RegisteredClientRepository registeredClientRepository;
    private final ObjectMapper objectMapper = createObjectMapper();
    
    private static ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }

    @Override
    public void save(OAuth2Authorization authorization) {
        Assert.notNull(authorization, "authorization cannot be null");
        
        AuthorizationDocument document = toDocument(authorization);
        mongoTemplate.save(document, "oauth2_authorizations");
    }

    @Override
    public void remove(OAuth2Authorization authorization) {
        Assert.notNull(authorization, "authorization cannot be null");
        
        Query query = new Query(Criteria.where("id").is(authorization.getId()));
        mongoTemplate.remove(query, "oauth2_authorizations");
    }

    @Override
    public OAuth2Authorization findById(String id) {
        Assert.hasText(id, "id cannot be empty");
        
        Query query = new Query(Criteria.where("id").is(id));
        AuthorizationDocument document = mongoTemplate.findOne(query, AuthorizationDocument.class, "oauth2_authorizations");
        
        return document != null ? toAuthorization(document) : null;
    }

    @Override
    public OAuth2Authorization findByToken(String token, OAuth2TokenType tokenType) {
        Assert.hasText(token, "token cannot be empty");
        
        Query query = new Query();
        
        if (tokenType == null) {
            // Search in all token fields
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("state").is(token),
                Criteria.where("authorizationCodeValue").is(token),
                Criteria.where("accessTokenValue").is(token),
                Criteria.where("refreshTokenValue").is(token),
                Criteria.where("oidcIdTokenValue").is(token)
            ));
        } else if (OAuth2ParameterNames.STATE.equals(tokenType.getValue())) {
            query.addCriteria(Criteria.where("state").is(token));
        } else if (OAuth2ParameterNames.CODE.equals(tokenType.getValue())) {
            query.addCriteria(Criteria.where("authorizationCodeValue").is(token));
        } else if (OAuth2TokenType.ACCESS_TOKEN.equals(tokenType)) {
            query.addCriteria(Criteria.where("accessTokenValue").is(token));
        } else if (OAuth2TokenType.REFRESH_TOKEN.equals(tokenType)) {
            query.addCriteria(Criteria.where("refreshTokenValue").is(token));
        } else if (OidcParameterNames.ID_TOKEN.equals(tokenType.getValue())) {
            query.addCriteria(Criteria.where("oidcIdTokenValue").is(token));
        }
        
        AuthorizationDocument document = mongoTemplate.findOne(query, AuthorizationDocument.class, "oauth2_authorizations");
        
        return document != null ? toAuthorization(document) : null;
    }

    private AuthorizationDocument toDocument(OAuth2Authorization authorization) {
        AuthorizationDocument document = new AuthorizationDocument();
        document.setId(authorization.getId());
        document.setRegisteredClientId(authorization.getRegisteredClientId());
        document.setPrincipalName(authorization.getPrincipalName());
        document.setAuthorizationGrantType(authorization.getAuthorizationGrantType().getValue());
        document.setAuthorizedScopes(String.join(",", authorization.getAuthorizedScopes()));
        
        // Convert attributes
        try {
            document.setAttributes(objectMapper.writeValueAsString(authorization.getAttributes()));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error serializing attributes", e);
        }
        
        // State
        if (authorization.getAttribute(OAuth2ParameterNames.STATE) != null) {
            document.setState((String) authorization.getAttribute(OAuth2ParameterNames.STATE));
        }
        
        // Authorization Code
        OAuth2Authorization.Token<OAuth2AuthorizationCode> authorizationCode = 
            authorization.getToken(OAuth2AuthorizationCode.class);
        if (authorizationCode != null) {
            document.setAuthorizationCodeValue(authorizationCode.getToken().getTokenValue());
            document.setAuthorizationCodeIssuedAt(authorizationCode.getToken().getIssuedAt());
            document.setAuthorizationCodeExpiresAt(authorizationCode.getToken().getExpiresAt());
            try {
                document.setAuthorizationCodeMetadata(
                    objectMapper.writeValueAsString(authorizationCode.getMetadata()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error serializing authorization code metadata", e);
            }
        }
        
        // Access Token
        OAuth2Authorization.Token<OAuth2AccessToken> accessToken = 
            authorization.getToken(OAuth2AccessToken.class);
        if (accessToken != null) {
            document.setAccessTokenValue(accessToken.getToken().getTokenValue());
            document.setAccessTokenIssuedAt(accessToken.getToken().getIssuedAt());
            document.setAccessTokenExpiresAt(accessToken.getToken().getExpiresAt());
            document.setAccessTokenType(accessToken.getToken().getTokenType().getValue());
            document.setAccessTokenScopes(String.join(",", accessToken.getToken().getScopes()));
            try {
                document.setAccessTokenMetadata(
                    objectMapper.writeValueAsString(accessToken.getMetadata()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error serializing access token metadata", e);
            }
        }
        
        // Refresh Token
        OAuth2Authorization.Token<OAuth2RefreshToken> refreshToken = 
            authorization.getToken(OAuth2RefreshToken.class);
        if (refreshToken != null) {
            document.setRefreshTokenValue(refreshToken.getToken().getTokenValue());
            document.setRefreshTokenIssuedAt(refreshToken.getToken().getIssuedAt());
            document.setRefreshTokenExpiresAt(refreshToken.getToken().getExpiresAt());
            try {
                document.setRefreshTokenMetadata(
                    objectMapper.writeValueAsString(refreshToken.getMetadata()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error serializing refresh token metadata", e);
            }
        }
        
        // OIDC ID Token
        OAuth2Authorization.Token<OidcIdToken> oidcIdToken = 
            authorization.getToken(OidcIdToken.class);
        if (oidcIdToken != null) {
            document.setOidcIdTokenValue(oidcIdToken.getToken().getTokenValue());
            document.setOidcIdTokenIssuedAt(oidcIdToken.getToken().getIssuedAt());
            document.setOidcIdTokenExpiresAt(oidcIdToken.getToken().getExpiresAt());
            try {
                document.setOidcIdTokenMetadata(
                    objectMapper.writeValueAsString(oidcIdToken.getMetadata()));
                document.setOidcIdTokenClaims(
                    objectMapper.writeValueAsString(oidcIdToken.getToken().getClaims()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error serializing OIDC ID token metadata", e);
            }
        }
        
        return document;
    }

    private OAuth2Authorization toAuthorization(AuthorizationDocument document) {
        RegisteredClient registeredClient = registeredClientRepository.findById(document.getRegisteredClientId());
        if (registeredClient == null) {
            throw new DataRetrievalFailureException(
                "The RegisteredClient with id '" + document.getRegisteredClientId() + "' was not found in the RegisteredClientRepository.");
        }

        OAuth2Authorization.Builder builder = OAuth2Authorization.withRegisteredClient(registeredClient)
            .id(document.getId())
            .principalName(document.getPrincipalName())
            .authorizationGrantType(resolveAuthorizationGrantType(document.getAuthorizationGrantType()))
            .authorizedScopes(StringUtils.commaDelimitedListToSet(document.getAuthorizedScopes()));

        // Attributes
        try {
            if (StringUtils.hasText(document.getAttributes())) {
                Map<String, Object> attributes = objectMapper.readValue(
                    document.getAttributes(), new TypeReference<Map<String, Object>>() {});
                builder.attributes(attrs -> attrs.putAll(attributes));
            }
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error deserializing attributes", e);
        }

        // State
        if (StringUtils.hasText(document.getState())) {
            builder.attribute(OAuth2ParameterNames.STATE, document.getState());
        }

        // Authorization Code
        if (StringUtils.hasText(document.getAuthorizationCodeValue())) {
            OAuth2AuthorizationCode authorizationCode = new OAuth2AuthorizationCode(
                document.getAuthorizationCodeValue(),
                document.getAuthorizationCodeIssuedAt(),
                document.getAuthorizationCodeExpiresAt()
            );
            
            builder.token(authorizationCode, metadata -> {
                try {
                    if (StringUtils.hasText(document.getAuthorizationCodeMetadata())) {
                        Map<String, Object> metadataMap = objectMapper.readValue(
                            document.getAuthorizationCodeMetadata(), new TypeReference<Map<String, Object>>() {});
                        metadata.putAll(metadataMap);
                    }
                } catch (JsonProcessingException e) {
                    throw new RuntimeException("Error deserializing authorization code metadata", e);
                }
            });
        }

        // Access Token
        if (StringUtils.hasText(document.getAccessTokenValue())) {
            OAuth2AccessToken accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER,
                document.getAccessTokenValue(),
                document.getAccessTokenIssuedAt(),
                document.getAccessTokenExpiresAt(),
                StringUtils.commaDelimitedListToSet(document.getAccessTokenScopes())
            );
            
            builder.token(accessToken, metadata -> {
                try {
                    if (StringUtils.hasText(document.getAccessTokenMetadata())) {
                        Map<String, Object> metadataMap = objectMapper.readValue(
                            document.getAccessTokenMetadata(), new TypeReference<Map<String, Object>>() {});
                        metadata.putAll(metadataMap);
                    }
                } catch (JsonProcessingException e) {
                    throw new RuntimeException("Error deserializing access token metadata", e);
                }
            });
        }

        // Refresh Token
        if (StringUtils.hasText(document.getRefreshTokenValue())) {
            OAuth2RefreshToken refreshToken = new OAuth2RefreshToken(
                document.getRefreshTokenValue(),
                document.getRefreshTokenIssuedAt(),
                document.getRefreshTokenExpiresAt()
            );
            
            builder.token(refreshToken, metadata -> {
                try {
                    if (StringUtils.hasText(document.getRefreshTokenMetadata())) {
                        Map<String, Object> metadataMap = objectMapper.readValue(
                            document.getRefreshTokenMetadata(), new TypeReference<Map<String, Object>>() {});
                        metadata.putAll(metadataMap);
                    }
                } catch (JsonProcessingException e) {
                    throw new RuntimeException("Error deserializing refresh token metadata", e);
                }
            });
        }

        // OIDC ID Token
        if (StringUtils.hasText(document.getOidcIdTokenValue())) {
            Map<String, Object> claims;
            try {
                claims = StringUtils.hasText(document.getOidcIdTokenClaims()) ?
                    objectMapper.readValue(document.getOidcIdTokenClaims(), new TypeReference<Map<String, Object>>() {}) :
                    Map.of();
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error deserializing OIDC ID token claims", e);
            }
            
            OidcIdToken oidcIdToken = new OidcIdToken(
                document.getOidcIdTokenValue(),
                document.getOidcIdTokenIssuedAt(),
                document.getOidcIdTokenExpiresAt(),
                claims
            );
            
            builder.token(oidcIdToken, metadata -> {
                try {
                    if (StringUtils.hasText(document.getOidcIdTokenMetadata())) {
                        Map<String, Object> metadataMap = objectMapper.readValue(
                            document.getOidcIdTokenMetadata(), new TypeReference<Map<String, Object>>() {});
                        metadata.putAll(metadataMap);
                    }
                } catch (JsonProcessingException e) {
                    throw new RuntimeException("Error deserializing OIDC ID token metadata", e);
                }
            });
        }

        return builder.build();
    }

    private AuthorizationGrantType resolveAuthorizationGrantType(String authorizationGrantType) {
        if (AuthorizationGrantType.AUTHORIZATION_CODE.getValue().equals(authorizationGrantType)) {
            return AuthorizationGrantType.AUTHORIZATION_CODE;
        } else if (AuthorizationGrantType.CLIENT_CREDENTIALS.getValue().equals(authorizationGrantType)) {
            return AuthorizationGrantType.CLIENT_CREDENTIALS;
        } else if (AuthorizationGrantType.REFRESH_TOKEN.getValue().equals(authorizationGrantType)) {
            return AuthorizationGrantType.REFRESH_TOKEN;
        }
        return new AuthorizationGrantType(authorizationGrantType);
    }

    // Document class for MongoDB storage
    public static class AuthorizationDocument {
        private String id;
        private String registeredClientId;
        private String principalName;
        private String authorizationGrantType;
        private String authorizedScopes;
        private String attributes;
        private String state;

        // Authorization Code
        private String authorizationCodeValue;
        private Instant authorizationCodeIssuedAt;
        private Instant authorizationCodeExpiresAt;
        private String authorizationCodeMetadata;

        // Access Token
        private String accessTokenValue;
        private Instant accessTokenIssuedAt;
        private Instant accessTokenExpiresAt;
        private String accessTokenType;
        private String accessTokenScopes;
        private String accessTokenMetadata;

        // Refresh Token
        private String refreshTokenValue;
        private Instant refreshTokenIssuedAt;
        private Instant refreshTokenExpiresAt;
        private String refreshTokenMetadata;

        // OIDC ID Token
        private String oidcIdTokenValue;
        private Instant oidcIdTokenIssuedAt;
        private Instant oidcIdTokenExpiresAt;
        private String oidcIdTokenMetadata;
        private String oidcIdTokenClaims;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getRegisteredClientId() { return registeredClientId; }
        public void setRegisteredClientId(String registeredClientId) { this.registeredClientId = registeredClientId; }

        public String getPrincipalName() { return principalName; }
        public void setPrincipalName(String principalName) { this.principalName = principalName; }

        public String getAuthorizationGrantType() { return authorizationGrantType; }
        public void setAuthorizationGrantType(String authorizationGrantType) { this.authorizationGrantType = authorizationGrantType; }

        public String getAuthorizedScopes() { return authorizedScopes; }
        public void setAuthorizedScopes(String authorizedScopes) { this.authorizedScopes = authorizedScopes; }

        public String getAttributes() { return attributes; }
        public void setAttributes(String attributes) { this.attributes = attributes; }

        public String getState() { return state; }
        public void setState(String state) { this.state = state; }

        public String getAuthorizationCodeValue() { return authorizationCodeValue; }
        public void setAuthorizationCodeValue(String authorizationCodeValue) { this.authorizationCodeValue = authorizationCodeValue; }

        public Instant getAuthorizationCodeIssuedAt() { return authorizationCodeIssuedAt; }
        public void setAuthorizationCodeIssuedAt(Instant authorizationCodeIssuedAt) { this.authorizationCodeIssuedAt = authorizationCodeIssuedAt; }

        public Instant getAuthorizationCodeExpiresAt() { return authorizationCodeExpiresAt; }
        public void setAuthorizationCodeExpiresAt(Instant authorizationCodeExpiresAt) { this.authorizationCodeExpiresAt = authorizationCodeExpiresAt; }

        public String getAuthorizationCodeMetadata() { return authorizationCodeMetadata; }
        public void setAuthorizationCodeMetadata(String authorizationCodeMetadata) { this.authorizationCodeMetadata = authorizationCodeMetadata; }

        public String getAccessTokenValue() { return accessTokenValue; }
        public void setAccessTokenValue(String accessTokenValue) { this.accessTokenValue = accessTokenValue; }

        public Instant getAccessTokenIssuedAt() { return accessTokenIssuedAt; }
        public void setAccessTokenIssuedAt(Instant accessTokenIssuedAt) { this.accessTokenIssuedAt = accessTokenIssuedAt; }

        public Instant getAccessTokenExpiresAt() { return accessTokenExpiresAt; }
        public void setAccessTokenExpiresAt(Instant accessTokenExpiresAt) { this.accessTokenExpiresAt = accessTokenExpiresAt; }

        public String getAccessTokenType() { return accessTokenType; }
        public void setAccessTokenType(String accessTokenType) { this.accessTokenType = accessTokenType; }

        public String getAccessTokenScopes() { return accessTokenScopes; }
        public void setAccessTokenScopes(String accessTokenScopes) { this.accessTokenScopes = accessTokenScopes; }

        public String getAccessTokenMetadata() { return accessTokenMetadata; }
        public void setAccessTokenMetadata(String accessTokenMetadata) { this.accessTokenMetadata = accessTokenMetadata; }

        public String getRefreshTokenValue() { return refreshTokenValue; }
        public void setRefreshTokenValue(String refreshTokenValue) { this.refreshTokenValue = refreshTokenValue; }

        public Instant getRefreshTokenIssuedAt() { return refreshTokenIssuedAt; }
        public void setRefreshTokenIssuedAt(Instant refreshTokenIssuedAt) { this.refreshTokenIssuedAt = refreshTokenIssuedAt; }

        public Instant getRefreshTokenExpiresAt() { return refreshTokenExpiresAt; }
        public void setRefreshTokenExpiresAt(Instant refreshTokenExpiresAt) { this.refreshTokenExpiresAt = refreshTokenExpiresAt; }

        public String getRefreshTokenMetadata() { return refreshTokenMetadata; }
        public void setRefreshTokenMetadata(String refreshTokenMetadata) { this.refreshTokenMetadata = refreshTokenMetadata; }

        public String getOidcIdTokenValue() { return oidcIdTokenValue; }
        public void setOidcIdTokenValue(String oidcIdTokenValue) { this.oidcIdTokenValue = oidcIdTokenValue; }

        public Instant getOidcIdTokenIssuedAt() { return oidcIdTokenIssuedAt; }
        public void setOidcIdTokenIssuedAt(Instant oidcIdTokenIssuedAt) { this.oidcIdTokenIssuedAt = oidcIdTokenIssuedAt; }

        public Instant getOidcIdTokenExpiresAt() { return oidcIdTokenExpiresAt; }
        public void setOidcIdTokenExpiresAt(Instant oidcIdTokenExpiresAt) { this.oidcIdTokenExpiresAt = oidcIdTokenExpiresAt; }

        public String getOidcIdTokenMetadata() { return oidcIdTokenMetadata; }
        public void setOidcIdTokenMetadata(String oidcIdTokenMetadata) { this.oidcIdTokenMetadata = oidcIdTokenMetadata; }

        public String getOidcIdTokenClaims() { return oidcIdTokenClaims; }
        public void setOidcIdTokenClaims(String oidcIdTokenClaims) { this.oidcIdTokenClaims = oidcIdTokenClaims; }
    }
} 