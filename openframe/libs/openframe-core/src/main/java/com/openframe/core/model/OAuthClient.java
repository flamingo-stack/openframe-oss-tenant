package com.openframe.core.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "oauth_clients")
public class OAuthClient {
    @Id
    private String id;
    private String clientId;
    private String clientSecret;
    private String[] redirectUris;
    private String[] grantTypes;  // "authorization_code", "password", "client_credentials", "refresh_token"
    private String[] scopes;
} 