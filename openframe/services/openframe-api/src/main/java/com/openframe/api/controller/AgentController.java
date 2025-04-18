package com.openframe.api.controller;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.dto.agent.AgentRegistrationRequest;
import com.openframe.api.dto.agent.AgentRegistrationResponse;
import com.openframe.core.model.Machine;
import com.openframe.core.model.OAuthClient;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.OAuthClientRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
public class AgentController {
    
    private final OAuthClientRepository oauthClientRepository;
    private final MachineRepository machineRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    
    @PostMapping("/register")
    public ResponseEntity<AgentRegistrationResponse> register(
            @RequestHeader("X-Initial-Key") String initialKey,
            @RequestBody AgentRegistrationRequest request) {
        
        // Check for existing machine
        Optional<OAuthClient> existingClient = oauthClientRepository
            .findByMachineId(request.getMachineId());
        
        if (existingClient.isPresent()) {
            throw new IllegalArgumentException("Machine already registered");
        }
        
        String clientId = "agent_" + request.getMachineId();
        String clientSecret = generateSecureSecret();
        
        OAuthClient client = new OAuthClient();
        client.setClientId(clientId);
        client.setClientSecret(clientSecret);
        client.setMachineId(request.getMachineId());
        client.setGrantTypes(new String[]{"client_credentials"});
        client.setScopes(new String[]{
                "metrics:write",
                "agentgateway:proxy"
        });
        
        oauthClientRepository.save(client);
            
        // Save machine details
        Machine machine = new Machine();
        machine.setMachineId(request.getMachineId());
        machine.setHostname(request.getHostname());
        machine.setIp(request.getIp());
        machine.setMacAddress(request.getMacAddress());
        machine.setOsUuid(request.getOsUuid());
        machine.setAgentVersion(request.getAgentVersion());
        machine.setLastSeen(Instant.now());
        machine.setStatus("ACTIVE");
        
        machineRepository.save(machine);
        
        return ResponseEntity.ok(new AgentRegistrationResponse(clientId, clientSecret));
    }

    private String generateSecureSecret() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
} 