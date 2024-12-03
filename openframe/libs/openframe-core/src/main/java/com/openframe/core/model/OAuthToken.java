package com.openframe.core.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "oauth_tokens")
public class OAuthToken {
    @Id
    private String id;
    private String userId;
    private String clientId;
    private String accessToken;
    private String refreshToken;
    private Instant accessTokenExpiry;
    private Instant refreshTokenExpiry;
} 