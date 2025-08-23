package com.openframe.authz.controller;

import com.openframe.authz.dto.OAuthClientRequest;
import com.openframe.authz.dto.OAuthClientResponse;
import com.openframe.authz.service.OAuthClientManagementService;
import com.openframe.core.model.OAuthClient;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/oauth/clients")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class OAuthClientController {

    private final OAuthClientManagementService clientService;

    @GetMapping
    public ResponseEntity<List<OAuthClientResponse>> getAllClients(
            @RequestParam(required = false) String clientType) {
        
        List<OAuthClient> clients;
        if (clientType != null) {
            clients = clientService.findByClientType(clientType);
        } else {
            clients = clientService.findAllByTenant();
        }
        
        List<OAuthClientResponse> response = clients.stream()
                .map(OAuthClientResponse::from)
                .toList();
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{clientId}")
    public ResponseEntity<OAuthClientResponse> getClient(@PathVariable String clientId) {
        Optional<OAuthClient> client = clientService.findByClientId(clientId);
        
        return client.map(c -> ResponseEntity.ok(OAuthClientResponse.from(c)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<OAuthClientResponse> createClient(@Valid @RequestBody OAuthClientRequest clientRequest) {
        try {
            OAuthClient request = convertToEntity(clientRequest);
            OAuthClient created = clientService.createClient(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(OAuthClientResponse.from(created));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid client creation request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Failed to create OAuth client", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{clientId}")
    public ResponseEntity<OAuthClientResponse> updateClient(
            @PathVariable String clientId,
            @Valid @RequestBody OAuthClientRequest updateRequest) {
        
        try {
            OAuthClient request = convertToEntity(updateRequest);
            OAuthClient updated = clientService.updateClient(clientId, request);
            return ResponseEntity.ok(OAuthClientResponse.from(updated));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid client update request for {}: {}", clientId, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Failed to update OAuth client: {}", clientId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{clientId}")
    public ResponseEntity<Void> deleteClient(@PathVariable String clientId) {
        try {
            clientService.deleteClient(clientId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.warn("Client not found for deletion: {}", clientId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Failed to delete OAuth client: {}", clientId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{clientId}/enable")
    public ResponseEntity<Void> enableClient(@PathVariable String clientId) {
        try {
            clientService.enableClient(clientId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.warn("Client not found for enable: {}", clientId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Failed to enable OAuth client: {}", clientId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{clientId}/disable")
    public ResponseEntity<Void> disableClient(@PathVariable String clientId) {
        try {
            clientService.deleteClient(clientId); // Uses soft delete
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.warn("Client not found for disable: {}", clientId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Failed to disable OAuth client: {}", clientId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private OAuthClient convertToEntity(OAuthClientRequest request) {
        OAuthClient client = new OAuthClient();
        client.setClientId(request.getClientId());
        client.setClientName(request.getClientName());
        client.setClientDescription(request.getClientDescription());
        client.setClientSecret(request.getClientSecret());
        client.setLogoUri(request.getLogoUri());
        client.setContacts(request.getContacts());
        client.setRedirectUris(request.getRedirectUris());
        client.setGrantTypes(request.getGrantTypes());
        client.setScopes(request.getScopes());
        client.setClientAuthenticationMethods(request.getClientAuthenticationMethods());
        client.setClientType(request.getClientType());
        client.setRequireProofKey(request.isRequireProofKey());
        client.setRequireAuthorizationConsent(request.isRequireAuthorizationConsent());
        client.setAccessTokenTimeToLive(request.getAccessTokenTimeToLive());
        client.setRefreshTokenTimeToLive(request.getRefreshTokenTimeToLive());
        client.setReuseRefreshTokens(request.isReuseRefreshTokens());
        return client;
    }
}