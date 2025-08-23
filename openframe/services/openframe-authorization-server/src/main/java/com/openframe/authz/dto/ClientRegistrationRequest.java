package com.openframe.authz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

@Data
public class ClientRegistrationRequest {
    
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
    
    @NotEmpty(message = "At least one redirect URI is required")
    @JsonProperty("redirect_uris")
    private String[] redirectUris;
    
    @JsonProperty("grant_types")
    private String[] grantTypes = new String[]{"authorization_code", "refresh_token"};
    
    @JsonProperty("response_types")
    private String[] responseTypes = new String[]{"code"};
    
    @JsonProperty("scope")
    private String scope = "openid profile email";
    
    @JsonProperty("token_endpoint_auth_method")
    private String tokenEndpointAuthMethod = "client_secret_basic";
    
    @JsonProperty("application_type")
    private String applicationType = "web";
    
    @JsonProperty("subject_type")
    private String subjectType = "public";
    
    @JsonProperty("id_token_signed_response_alg")
    private String idTokenSignedResponseAlg = "RS256";
    
    @JsonProperty("require_auth_time")
    private Boolean requireAuthTime = false;
    
    @JsonProperty("default_max_age")
    private Long defaultMaxAge;
    
    @JsonProperty("initiate_login_uri")
    private String initiateLoginUri;
    
    @JsonProperty("request_uris")
    private String[] requestUris;
    
    @JsonProperty("post_logout_redirect_uris")
    private String[] postLogoutRedirectUris;
    
    // OpenFrame specific extensions
    @JsonProperty("client_type")
    private String clientType = "external";
}