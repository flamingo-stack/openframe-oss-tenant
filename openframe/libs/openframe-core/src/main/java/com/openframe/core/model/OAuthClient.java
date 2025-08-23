package com.openframe.core.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Arrays;

@Data
@Document(collection = "oauth_clients")
@CompoundIndex(def = "{'tenantId': 1, 'clientId': 1}", unique = true)
public class OAuthClient {
    @Id
    private String id;
    
    // Core OAuth2 Fields
    @Indexed
    private String clientId;
    private String clientSecret; // Encrypted
    private String[] redirectUris;
    private String[] grantTypes;  // "authorization_code", "password", "client_credentials", "refresh_token"
    private String[] scopes;
    private boolean enabled = true;
    
    // Multi-tenant Support
    @Indexed
    private String tenantId;
    
    // Spring Authorization Server Fields
    private String[] clientAuthenticationMethods; // client_secret_basic, none, etc.
    private boolean requireProofKey = true; // PKCE
    private boolean requireAuthorizationConsent = false;
    private Long accessTokenTimeToLive = 3600L; // seconds
    private Long refreshTokenTimeToLive = 86400L; // seconds
    private boolean reuseRefreshTokens = false;
    
    // Client Metadata
    private String clientType; // "agent", "external", "internal"
    private String clientName;
    private String clientDescription;
    private String logoUri;
    private String[] contacts;
    
    // Authorization & Access Control
    private String[] roles = new String[]{}; // For agent clients
    private String machineId; // For agent clients only
    
    // Audit Fields
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    // Validation Methods
    public boolean isActive() {
        return enabled && clientId != null && !clientId.trim().isEmpty();
    }
    
    public boolean isPublicClient() {
        return clientAuthenticationMethods != null && 
               Arrays.asList(clientAuthenticationMethods).contains("none");
    }
    
    public boolean supportsGrantType(String grantType) {
        return grantTypes != null && Arrays.asList(grantTypes).contains(grantType);
    }
    
    public boolean hasScope(String scope) {
        return scopes != null && Arrays.asList(scopes).contains(scope);
    }
    
    public boolean isRedirectUriValid(String redirectUri) {
        return redirectUris != null && Arrays.asList(redirectUris).contains(redirectUri);
    }
} 