package com.openframe.authz.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@RequiredArgsConstructor
public class MongoRegisteredClientRepository implements RegisteredClientRepository {

    private final MongoTemplate mongoTemplate;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper = createObjectMapper();
    
    private static ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }

    @Override
    public void save(RegisteredClient registeredClient) {
        Assert.notNull(registeredClient, "registeredClient cannot be null");
        
        ClientDocument document = toDocument(registeredClient);
        mongoTemplate.save(document, "oauth2_registered_clients");
    }

    @Override
    public RegisteredClient findById(String id) {
        Assert.hasText(id, "id cannot be empty");
        
        Query query = new Query(Criteria.where("id").is(id));
        ClientDocument document = mongoTemplate.findOne(query, ClientDocument.class, "oauth2_registered_clients");
        
        return document != null ? toRegisteredClient(document) : null;
    }

    @Override
    public RegisteredClient findByClientId(String clientId) {
        Assert.hasText(clientId, "clientId cannot be empty");
        
        Query query = new Query(Criteria.where("clientId").is(clientId));
        ClientDocument document = mongoTemplate.findOne(query, ClientDocument.class, "oauth2_registered_clients");
        
        return document != null ? toRegisteredClient(document) : null;
    }

    private ClientDocument toDocument(RegisteredClient client) {
        ClientDocument document = new ClientDocument();
        document.setId(client.getId());
        document.setClientId(client.getClientId());
        document.setClientIdIssuedAt(client.getClientIdIssuedAt());
        document.setClientSecret(client.getClientSecret());
        document.setClientSecretExpiresAt(client.getClientSecretExpiresAt());
        document.setClientName(client.getClientName());
        
        // Convert authentication methods
        Set<String> authMethods = new HashSet<>();
        client.getClientAuthenticationMethods().forEach(method -> 
            authMethods.add(method.getValue()));
        document.setClientAuthenticationMethods(authMethods);
        
        // Convert grant types
        Set<String> grantTypes = new HashSet<>();
        client.getAuthorizationGrantTypes().forEach(grantType -> 
            grantTypes.add(grantType.getValue()));
        document.setAuthorizationGrantTypes(grantTypes);
        
        // Set other collections
        document.setRedirectUris(client.getRedirectUris());
        document.setPostLogoutRedirectUris(client.getPostLogoutRedirectUris());
        document.setScopes(client.getScopes());
        
        // Convert settings to JSON
        try {
            document.setClientSettings(objectMapper.writeValueAsString(client.getClientSettings().getSettings()));
            document.setTokenSettings(objectMapper.writeValueAsString(client.getTokenSettings().getSettings()));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error serializing client settings", e);
        }
        
        return document;
    }

    private RegisteredClient toRegisteredClient(ClientDocument document) {
        RegisteredClient.Builder builder = RegisteredClient.withId(document.getId())
            .clientId(document.getClientId())
            .clientIdIssuedAt(document.getClientIdIssuedAt())
            .clientSecret(document.getClientSecret())
            .clientSecretExpiresAt(document.getClientSecretExpiresAt())
            .clientName(document.getClientName());

        // Convert authentication methods
        document.getClientAuthenticationMethods().forEach(method -> 
            builder.clientAuthenticationMethod(resolveClientAuthenticationMethod(method)));

        // Convert grant types
        document.getAuthorizationGrantTypes().forEach(grantType -> 
            builder.authorizationGrantType(resolveAuthorizationGrantType(grantType)));

        // Set collections
        builder.redirectUris(uris -> uris.addAll(document.getRedirectUris()));
        builder.postLogoutRedirectUris(uris -> uris.addAll(document.getPostLogoutRedirectUris()));
        builder.scopes(scopes -> scopes.addAll(document.getScopes()));

        // Convert settings from JSON
        try {
            if (StringUtils.hasText(document.getClientSettings())) {
                Map<String, Object> clientSettingsMap = objectMapper.readValue(
                    document.getClientSettings(), new TypeReference<>() {
                        });
                builder.clientSettings(ClientSettings.withSettings(clientSettingsMap).build());
            }
            
            if (StringUtils.hasText(document.getTokenSettings())) {
                Map<String, Object> tokenSettingsMap = objectMapper.readValue(
                    document.getTokenSettings(), new TypeReference<>() {
                        });
                builder.tokenSettings(TokenSettings.withSettings(tokenSettingsMap).build());
            }
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error deserializing client settings", e);
        }

        return builder.build();
    }

    private ClientAuthenticationMethod resolveClientAuthenticationMethod(String method) {
        if (ClientAuthenticationMethod.CLIENT_SECRET_BASIC.getValue().equals(method)) {
            return ClientAuthenticationMethod.CLIENT_SECRET_BASIC;
        } else if (ClientAuthenticationMethod.CLIENT_SECRET_POST.getValue().equals(method)) {
            return ClientAuthenticationMethod.CLIENT_SECRET_POST;
        } else if (ClientAuthenticationMethod.NONE.getValue().equals(method)) {
            return ClientAuthenticationMethod.NONE;
        }
        return new ClientAuthenticationMethod(method);
    }

    private AuthorizationGrantType resolveAuthorizationGrantType(String grantType) {
        if (AuthorizationGrantType.AUTHORIZATION_CODE.getValue().equals(grantType)) {
            return AuthorizationGrantType.AUTHORIZATION_CODE;
        } else if (AuthorizationGrantType.CLIENT_CREDENTIALS.getValue().equals(grantType)) {
            return AuthorizationGrantType.CLIENT_CREDENTIALS;
        } else if (AuthorizationGrantType.REFRESH_TOKEN.getValue().equals(grantType)) {
            return AuthorizationGrantType.REFRESH_TOKEN;
        }
        return new AuthorizationGrantType(grantType);
    }

    // Document class for MongoDB storage
    public static class ClientDocument {
        private String id;
        private String tenantId; // Add tenant isolation
        private String clientId;
        private Instant clientIdIssuedAt;
        private String clientSecret;
        private Instant clientSecretExpiresAt;
        private String clientName;
        private Set<String> clientAuthenticationMethods = new HashSet<>();
        private Set<String> authorizationGrantTypes = new HashSet<>();
        private Set<String> redirectUris = new HashSet<>();
        private Set<String> postLogoutRedirectUris = new HashSet<>();
        private Set<String> scopes = new HashSet<>();
        private String clientSettings;
        private String tokenSettings;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        
        public String getTenantId() { return tenantId; }
        public void setTenantId(String tenantId) { this.tenantId = tenantId; }

        public String getClientId() { return clientId; }
        public void setClientId(String clientId) { this.clientId = clientId; }

        public Instant getClientIdIssuedAt() { return clientIdIssuedAt; }
        public void setClientIdIssuedAt(Instant clientIdIssuedAt) { this.clientIdIssuedAt = clientIdIssuedAt; }

        public String getClientSecret() { return clientSecret; }
        public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }

        public Instant getClientSecretExpiresAt() { return clientSecretExpiresAt; }
        public void setClientSecretExpiresAt(Instant clientSecretExpiresAt) { this.clientSecretExpiresAt = clientSecretExpiresAt; }

        public String getClientName() { return clientName; }
        public void setClientName(String clientName) { this.clientName = clientName; }

        public Set<String> getClientAuthenticationMethods() { return clientAuthenticationMethods; }
        public void setClientAuthenticationMethods(Set<String> clientAuthenticationMethods) { this.clientAuthenticationMethods = clientAuthenticationMethods; }

        public Set<String> getAuthorizationGrantTypes() { return authorizationGrantTypes; }
        public void setAuthorizationGrantTypes(Set<String> authorizationGrantTypes) { this.authorizationGrantTypes = authorizationGrantTypes; }

        public Set<String> getRedirectUris() { return redirectUris; }
        public void setRedirectUris(Set<String> redirectUris) { this.redirectUris = redirectUris; }

        public Set<String> getPostLogoutRedirectUris() { return postLogoutRedirectUris; }
        public void setPostLogoutRedirectUris(Set<String> postLogoutRedirectUris) { this.postLogoutRedirectUris = postLogoutRedirectUris; }

        public Set<String> getScopes() { return scopes; }
        public void setScopes(Set<String> scopes) { this.scopes = scopes; }

        public String getClientSettings() { return clientSettings; }
        public void setClientSettings(String clientSettings) { this.clientSettings = clientSettings; }

        public String getTokenSettings() { return tokenSettings; }
        public void setTokenSettings(String tokenSettings) { this.tokenSettings = tokenSettings; }
    }
} 