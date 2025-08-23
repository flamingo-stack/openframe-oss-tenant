package com.openframe.authz.service;

import com.openframe.authz.dto.ClientRegistrationRequest;
import com.openframe.authz.dto.ClientRegistrationResponse;
import com.openframe.authz.tenant.TenantContext;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.service.EncryptionService;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DynamicClientRegistrationService {

    private final OAuthClientRepository repository;
    private final EncryptionService encryptionService;
    private final SecureRandom secureRandom = new SecureRandom();

    public ClientRegistrationResponse registerClient(ClientRegistrationRequest request) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not available for client registration");
        }

        validateRegistrationRequest(request);

        // Create OAuth client
        OAuthClient client = new OAuthClient();
        client.setClientId(generateClientId());
        client.setTenantId(tenantId);
        
        // Basic metadata
        client.setClientName(request.getClientName());
        client.setClientDescription(request.getClientDescription());
        client.setLogoUri(request.getLogoUri());
        client.setContacts(request.getContacts());
        client.setClientType(request.getClientType());
        
        // Generate client secret for confidential clients
        String clientSecret = null;
        if (isConfidentialClient(request.getTokenEndpointAuthMethod())) {
            clientSecret = generateClientSecret();
            try {
                client.setClientSecret(encryptionService.encryptClientSecret(clientSecret));
            } catch (Exception e) {
                log.error("Failed to encrypt client secret", e);
                throw new RuntimeException("Failed to encrypt client secret", e);
            }
        }
        
        // OAuth2 configuration
        client.setRedirectUris(request.getRedirectUris());
        client.setGrantTypes(request.getGrantTypes());
        client.setScopes(parseScopes(request.getScope()));
        client.setClientAuthenticationMethods(new String[]{request.getTokenEndpointAuthMethod()});
        
        // Spring Authorization Server settings
        client.setRequireProofKey("public".equals(request.getTokenEndpointAuthMethod()));
        client.setRequireAuthorizationConsent(false); // Can be customized
        client.setAccessTokenTimeToLive(3600L); // 1 hour
        client.setRefreshTokenTimeToLive(86400L); // 24 hours
        client.setReuseRefreshTokens(false);
        
        // Audit fields
        client.setEnabled(true);
        client.setCreatedAt(LocalDateTime.now());
        client.setUpdatedAt(LocalDateTime.now());
        
        // Save client
        OAuthClient saved = repository.save(client);
        log.info("Registered new OAuth client '{}' for tenant '{}'", saved.getClientId(), tenantId);
        
        // Build response
        return buildRegistrationResponse(saved, clientSecret, request);
    }

    private void validateRegistrationRequest(ClientRegistrationRequest request) {
        // Validate redirect URIs
        if (request.getRedirectUris() == null || request.getRedirectUris().length == 0) {
            throw new IllegalArgumentException("At least one redirect URI is required");
        }
        
        for (String uri : request.getRedirectUris()) {
            validateRedirectUri(uri);
        }
        
        // Validate grant types
        if (request.getGrantTypes() != null) {
            for (String grantType : request.getGrantTypes()) {
                validateGrantType(grantType);
            }
        }
        
        // Validate response types
        if (request.getResponseTypes() != null) {
            for (String responseType : request.getResponseTypes()) {
                validateResponseType(responseType);
            }
        }
        
        // Validate token endpoint auth method
        validateTokenEndpointAuthMethod(request.getTokenEndpointAuthMethod());
        
        // Validate application type
        if (request.getApplicationType() != null) {
            validateApplicationType(request.getApplicationType());
        }
    }

    private void validateRedirectUri(String uri) {
        if (!StringUtils.hasText(uri)) {
            throw new IllegalArgumentException("Redirect URI cannot be empty");
        }
        
        // Basic URI validation - can be enhanced
        try {
            java.net.URI.create(uri);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid redirect URI format: " + uri);
        }
        
        // Reject localhost for production
        if (uri.contains("localhost") || uri.contains("127.0.0.1")) {
            log.warn("Localhost redirect URI registered: {}", uri);
        }
    }

    private void validateGrantType(String grantType) {
        String[] validGrantTypes = {"authorization_code", "client_credentials", "refresh_token"};
        if (!Arrays.asList(validGrantTypes).contains(grantType)) {
            throw new IllegalArgumentException("Unsupported grant type: " + grantType);
        }
    }

    private void validateResponseType(String responseType) {
        String[] validResponseTypes = {"code", "token", "id_token"};
        if (!Arrays.asList(validResponseTypes).contains(responseType)) {
            throw new IllegalArgumentException("Unsupported response type: " + responseType);
        }
    }

    private void validateTokenEndpointAuthMethod(String method) {
        if (method == null) {
            return; // Will default to client_secret_basic
        }
        
        String[] validMethods = {"client_secret_basic", "client_secret_post", "none"};
        if (!Arrays.asList(validMethods).contains(method)) {
            throw new IllegalArgumentException("Unsupported token endpoint auth method: " + method);
        }
    }

    private void validateApplicationType(String applicationType) {
        String[] validTypes = {"web", "native"};
        if (!Arrays.asList(validTypes).contains(applicationType)) {
            throw new IllegalArgumentException("Unsupported application type: " + applicationType);
        }
    }

    private boolean isConfidentialClient(String tokenEndpointAuthMethod) {
        return !"none".equals(tokenEndpointAuthMethod);
    }

    private String[] parseScopes(String scope) {
        if (scope == null || scope.trim().isEmpty()) {
            return new String[]{"openid"};
        }
        return scope.split("\\s+");
    }

    private String generateClientId() {
        return "client_" + UUID.randomUUID().toString().replace("-", "");
    }

    private String generateClientSecret() {
        byte[] secretBytes = new byte[32];
        secureRandom.nextBytes(secretBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(secretBytes);
    }

    private ClientRegistrationResponse buildRegistrationResponse(
            OAuthClient client, String clientSecret, ClientRegistrationRequest request) {
        
        ClientRegistrationResponse response = new ClientRegistrationResponse();
        response.setClientId(client.getClientId());
        response.setClientSecret(clientSecret); // Plain text in response only
        response.setClientName(client.getClientName());
        response.setClientDescription(client.getClientDescription());
        response.setLogoUri(client.getLogoUri());
        response.setContacts(client.getContacts());
        response.setRedirectUris(client.getRedirectUris());
        response.setGrantTypes(client.getGrantTypes());
        response.setResponseTypes(request.getResponseTypes());
        response.setScope(String.join(" ", client.getScopes()));
        response.setTokenEndpointAuthMethod(request.getTokenEndpointAuthMethod());
        response.setApplicationType(request.getApplicationType());
        response.setSubjectType(request.getSubjectType());
        response.setIdTokenSignedResponseAlg(request.getIdTokenSignedResponseAlg());
        response.setRequireAuthTime(request.getRequireAuthTime());
        response.setDefaultMaxAge(request.getDefaultMaxAge());
        response.setInitiateLoginUri(request.getInitiateLoginUri());
        response.setRequestUris(request.getRequestUris());
        response.setPostLogoutRedirectUris(request.getPostLogoutRedirectUris());
        response.setClientType(client.getClientType());
        
        return response;
    }
}