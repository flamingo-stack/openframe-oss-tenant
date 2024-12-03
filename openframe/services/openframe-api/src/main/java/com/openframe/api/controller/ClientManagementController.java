package com.openframe.api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.dto.client.CreateClientRequest;
import com.openframe.core.model.OAuthClient;
import com.openframe.data.repository.OAuthClientRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
public class ClientManagementController {

    private final OAuthClientRepository clientRepository;

    @PostMapping
    public ResponseEntity<OAuthClient> createClient(@RequestBody CreateClientRequest request) {
        OAuthClient client = new OAuthClient();
        client.setClientId("client_" + UUID.randomUUID().toString());
        client.setClientSecret(UUID.randomUUID().toString());
        client.setGrantTypes(request.getGrantTypes());
        client.setScopes(request.getScopes());
        
        return ResponseEntity.ok(clientRepository.save(client));
    }

    @GetMapping
    public ResponseEntity<List<OAuthClient>> listClients() {
        return ResponseEntity.ok(clientRepository.findAll());
    }

    @DeleteMapping("/{clientId}")
    public ResponseEntity<?> deleteClient(@PathVariable String clientId) {
        OAuthClient client = clientRepository.findByClientId(clientId);
        if (client != null) {
            clientRepository.delete(client);
        }
        return ResponseEntity.ok().build();
    }
} 