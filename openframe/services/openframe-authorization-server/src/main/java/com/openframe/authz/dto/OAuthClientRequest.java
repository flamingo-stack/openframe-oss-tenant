package com.openframe.authz.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

@Data
public class OAuthClientRequest {
    
    private String clientId; // Optional - generated if not provided
    
    @NotBlank(message = "Client name is required")
    private String clientName;
    
    private String clientDescription;
    private String clientSecret; // Optional for public clients
    private String logoUri;
    private String[] contacts;
    
    @NotEmpty(message = "At least one redirect URI is required")
    private String[] redirectUris;
    
    @NotEmpty(message = "At least one grant type is required")  
    private String[] grantTypes;
    
    @NotEmpty(message = "At least one scope is required")
    private String[] scopes;
    
    private String[] clientAuthenticationMethods = new String[]{"client_secret_basic"};
    private String clientType = "external"; // external, internal, agent
    
    // Spring Authorization Server settings
    private boolean requireProofKey = true;
    private boolean requireAuthorizationConsent = false;
    private Long accessTokenTimeToLive = 3600L; // seconds
    private Long refreshTokenTimeToLive = 86400L; // seconds  
    private boolean reuseRefreshTokens = false;
}