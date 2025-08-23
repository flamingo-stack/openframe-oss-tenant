package com.openframe.authz.dto;

import com.openframe.core.model.OAuthClient;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OAuthClientResponse {
    
    private String id;
    private String clientId;
    private String clientName;
    private String clientDescription;
    private String clientType;
    private String logoUri;
    private String[] contacts;
    private String[] redirectUris;
    private String[] grantTypes;
    private String[] scopes;
    private String[] clientAuthenticationMethods;
    private boolean requireProofKey;
    private boolean requireAuthorizationConsent;
    private Long accessTokenTimeToLive;
    private Long refreshTokenTimeToLive;
    private boolean reuseRefreshTokens;
    private boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Factory method to create from OAuthClient
    public static OAuthClientResponse from(OAuthClient client) {
        OAuthClientResponse response = new OAuthClientResponse();
        response.setId(client.getId());
        response.setClientId(client.getClientId());
        response.setClientName(client.getClientName());
        response.setClientDescription(client.getClientDescription());
        response.setClientType(client.getClientType());
        response.setLogoUri(client.getLogoUri());
        response.setContacts(client.getContacts());
        response.setRedirectUris(client.getRedirectUris());
        response.setGrantTypes(client.getGrantTypes());
        response.setScopes(client.getScopes());
        response.setClientAuthenticationMethods(client.getClientAuthenticationMethods());
        response.setRequireProofKey(client.isRequireProofKey());
        response.setRequireAuthorizationConsent(client.isRequireAuthorizationConsent());
        response.setAccessTokenTimeToLive(client.getAccessTokenTimeToLive());
        response.setRefreshTokenTimeToLive(client.getRefreshTokenTimeToLive());
        response.setReuseRefreshTokens(client.isReuseRefreshTokens());
        response.setEnabled(client.isEnabled());
        response.setCreatedAt(client.getCreatedAt());
        response.setUpdatedAt(client.getUpdatedAt());
        return response;
    }
}