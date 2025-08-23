package com.openframe.authz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.Instant;

@Data
public class ClientRegistrationResponse {
    
    @JsonProperty("client_id")
    private String clientId;
    
    @JsonProperty("client_secret")
    private String clientSecret;
    
    @JsonProperty("client_secret_expires_at")
    private Long clientSecretExpiresAt = 0L; // 0 means never expires
    
    @JsonProperty("client_name")
    private String clientName;
    
    @JsonProperty("client_description")
    private String clientDescription;
    
    @JsonProperty("client_uri")
    private String clientUri;
    
    @JsonProperty("logo_uri")
    private String logoUri;
    
    @JsonProperty("contacts")
    private String[] contacts;
    
    @JsonProperty("redirect_uris")
    private String[] redirectUris;
    
    @JsonProperty("grant_types")
    private String[] grantTypes;
    
    @JsonProperty("response_types")
    private String[] responseTypes;
    
    @JsonProperty("scope")
    private String scope;
    
    @JsonProperty("token_endpoint_auth_method")
    private String tokenEndpointAuthMethod;
    
    @JsonProperty("application_type")
    private String applicationType;
    
    @JsonProperty("subject_type")
    private String subjectType;
    
    @JsonProperty("id_token_signed_response_alg")
    private String idTokenSignedResponseAlg;
    
    @JsonProperty("require_auth_time")
    private Boolean requireAuthTime;
    
    @JsonProperty("default_max_age")
    private Long defaultMaxAge;
    
    @JsonProperty("initiate_login_uri")
    private String initiateLoginUri;
    
    @JsonProperty("request_uris")
    private String[] requestUris;
    
    @JsonProperty("post_logout_redirect_uris")
    private String[] postLogoutRedirectUris;
    
    @JsonProperty("client_id_issued_at")
    private Long clientIdIssuedAt = Instant.now().getEpochSecond();
    
    @JsonProperty("registration_client_uri")
    private String registrationClientUri;
    
    @JsonProperty("registration_access_token")
    private String registrationAccessToken;
    
    // OpenFrame specific extensions
    @JsonProperty("client_type")
    private String clientType;
}