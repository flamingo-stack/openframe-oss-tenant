package com.openframe.authz.service;

import com.openframe.authz.tenant.TenantContext;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.service.EncryptionService;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OAuthClientManagementService {

    private final OAuthClientRepository repository;
    private final EncryptionService encryptionService;

    public Optional<OAuthClient> findById(String id) {
        return repository.findById(id)
                .filter(client -> belongsToCurrentTenant(client));
    }

    public Optional<OAuthClient> findByClientId(String clientId) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            log.warn("No tenant context available for client lookup: {}", clientId);
            return Optional.empty();
        }
        
        return repository.findByClientIdAndTenantId(clientId, tenantId)
                .filter(OAuthClient::isActive);
    }

    public List<OAuthClient> findAllByTenant() {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            log.warn("No tenant context available for client listing");
            return List.of();
        }
        
        return repository.findActiveByTenantId(tenantId);
    }

    public List<OAuthClient> findByClientType(String clientType) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            log.warn("No tenant context available for client type listing");
            return List.of();
        }
        
        return repository.findActiveByTenantIdAndClientType(tenantId, clientType);
    }

    public OAuthClient createClient(OAuthClient clientRequest) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not available for client creation");
        }

        validateClientRequest(clientRequest);
        
        // Check if client ID already exists
        if (StringUtils.hasText(clientRequest.getClientId()) &&
            repository.existsByClientIdAndTenantId(clientRequest.getClientId(), tenantId)) {
            throw new IllegalArgumentException("Client ID already exists: " + clientRequest.getClientId());
        }

        OAuthClient client = new OAuthClient();
        
        // Generate client ID if not provided
        if (!StringUtils.hasText(clientRequest.getClientId())) {
            client.setClientId(generateClientId());
        } else {
            client.setClientId(clientRequest.getClientId());
        }
        
        // Set tenant context
        client.setTenantId(tenantId);
        
        // Copy basic properties
        client.setClientName(clientRequest.getClientName());
        client.setClientDescription(clientRequest.getClientDescription());
        client.setClientType(clientRequest.getClientType());
        client.setLogoUri(clientRequest.getLogoUri());
        client.setContacts(clientRequest.getContacts());
        
        // Handle client secret
        if (StringUtils.hasText(clientRequest.getClientSecret())) {
            try {
                client.setClientSecret(encryptionService.encryptClientSecret(clientRequest.getClientSecret()));
            } catch (Exception e) {
                log.error("Failed to encrypt client secret", e);
                throw new RuntimeException("Failed to encrypt client secret", e);
            }
        }
        
        // Copy OAuth2 configuration
        client.setRedirectUris(clientRequest.getRedirectUris());
        client.setGrantTypes(clientRequest.getGrantTypes());
        client.setScopes(clientRequest.getScopes());
        client.setClientAuthenticationMethods(clientRequest.getClientAuthenticationMethods());
        
        // Copy Spring Authorization Server settings
        client.setRequireProofKey(clientRequest.isRequireProofKey());
        client.setRequireAuthorizationConsent(clientRequest.isRequireAuthorizationConsent());
        client.setAccessTokenTimeToLive(clientRequest.getAccessTokenTimeToLive());
        client.setRefreshTokenTimeToLive(clientRequest.getRefreshTokenTimeToLive());
        client.setReuseRefreshTokens(clientRequest.isReuseRefreshTokens());
        
        // Set defaults
        client.setEnabled(true);
        client.setCreatedAt(LocalDateTime.now());
        client.setUpdatedAt(LocalDateTime.now());
        
        OAuthClient saved = repository.save(client);
        log.info("Created OAuth client '{}' for tenant '{}'", saved.getClientId(), tenantId);
        
        return saved;
    }

    public OAuthClient updateClient(String clientId, OAuthClient updateRequest) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not available for client update");
        }

        OAuthClient existing = repository.findByClientIdAndTenantId(clientId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found: " + clientId));

        validateClientRequest(updateRequest);

        // Update basic properties
        if (StringUtils.hasText(updateRequest.getClientName())) {
            existing.setClientName(updateRequest.getClientName());
        }
        if (StringUtils.hasText(updateRequest.getClientDescription())) {
            existing.setClientDescription(updateRequest.getClientDescription());
        }
        if (StringUtils.hasText(updateRequest.getLogoUri())) {
            existing.setLogoUri(updateRequest.getLogoUri());
        }
        if (updateRequest.getContacts() != null) {
            existing.setContacts(updateRequest.getContacts());
        }

        // Update client secret if provided
        if (StringUtils.hasText(updateRequest.getClientSecret())) {
            try {
                existing.setClientSecret(encryptionService.encryptClientSecret(updateRequest.getClientSecret()));
            } catch (Exception e) {
                log.error("Failed to encrypt updated client secret", e);
                throw new RuntimeException("Failed to encrypt client secret", e);
            }
        }

        // Update OAuth2 configuration
        if (updateRequest.getRedirectUris() != null) {
            existing.setRedirectUris(updateRequest.getRedirectUris());
        }
        if (updateRequest.getGrantTypes() != null) {
            existing.setGrantTypes(updateRequest.getGrantTypes());
        }
        if (updateRequest.getScopes() != null) {
            existing.setScopes(updateRequest.getScopes());
        }
        if (updateRequest.getClientAuthenticationMethods() != null) {
            existing.setClientAuthenticationMethods(updateRequest.getClientAuthenticationMethods());
        }

        // Update Spring Authorization Server settings
        existing.setRequireProofKey(updateRequest.isRequireProofKey());
        existing.setRequireAuthorizationConsent(updateRequest.isRequireAuthorizationConsent());
        if (updateRequest.getAccessTokenTimeToLive() != null) {
            existing.setAccessTokenTimeToLive(updateRequest.getAccessTokenTimeToLive());
        }
        if (updateRequest.getRefreshTokenTimeToLive() != null) {
            existing.setRefreshTokenTimeToLive(updateRequest.getRefreshTokenTimeToLive());
        }
        existing.setReuseRefreshTokens(updateRequest.isReuseRefreshTokens());

        existing.setUpdatedAt(LocalDateTime.now());

        OAuthClient saved = repository.save(existing);
        log.info("Updated OAuth client '{}' for tenant '{}'", saved.getClientId(), tenantId);

        return saved;
    }

    public void deleteClient(String clientId) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not available for client deletion");
        }

        OAuthClient existing = repository.findByClientIdAndTenantId(clientId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found: " + clientId));

        // Soft delete - disable instead of hard delete
        existing.setEnabled(false);
        existing.setUpdatedAt(LocalDateTime.now());
        
        repository.save(existing);
        log.info("Disabled OAuth client '{}' for tenant '{}'", clientId, tenantId);
    }

    public void enableClient(String clientId) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not available for client enable");
        }

        OAuthClient existing = repository.findByClientIdAndTenantId(clientId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found: " + clientId));

        existing.setEnabled(true);
        existing.setUpdatedAt(LocalDateTime.now());
        
        repository.save(existing);
        log.info("Enabled OAuth client '{}' for tenant '{}'", clientId, tenantId);
    }

    private void validateClientRequest(OAuthClient client) {
        if (!StringUtils.hasText(client.getClientName())) {
            throw new IllegalArgumentException("Client name is required");
        }
        
        if (client.getRedirectUris() == null || client.getRedirectUris().length == 0) {
            throw new IllegalArgumentException("At least one redirect URI is required");
        }
        
        if (client.getGrantTypes() == null || client.getGrantTypes().length == 0) {
            throw new IllegalArgumentException("At least one grant type is required");
        }
        
        if (client.getScopes() == null || client.getScopes().length == 0) {
            throw new IllegalArgumentException("At least one scope is required");
        }
        
        // Validate redirect URIs format
        for (String uri : client.getRedirectUris()) {
            if (!StringUtils.hasText(uri)) {
                throw new IllegalArgumentException("Redirect URI cannot be empty");
            }
            // Additional URI validation could be added here
        }
        
        // Validate grant types
        String[] validGrantTypes = {"authorization_code", "client_credentials", "refresh_token", "password"};
        for (String grantType : client.getGrantTypes()) {
            if (!List.of(validGrantTypes).contains(grantType)) {
                throw new IllegalArgumentException("Invalid grant type: " + grantType);
            }
        }
    }

    private boolean belongsToCurrentTenant(OAuthClient client) {
        String currentTenantId = TenantContext.getTenantId();
        return currentTenantId != null && currentTenantId.equals(client.getTenantId());
    }

    private String generateClientId() {
        return "client_" + UUID.randomUUID().toString().replace("-", "");
    }
}