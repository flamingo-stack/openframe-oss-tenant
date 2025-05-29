package com.openframe.client.service;

import com.openframe.client.dto.agent.AgentRegistrationRequest;
import com.openframe.client.dto.agent.AgentRegistrationResponse;
import com.openframe.core.model.Machine;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.model.device.DeviceStatus;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AgentService {

    private final OAuthClientRepository oauthClientRepository;
    private final MachineRepository machineRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public AgentRegistrationResponse registerAgent(String initialKey, AgentRegistrationRequest request) {
        Optional<OAuthClient> existingClient = oauthClientRepository
                .findByMachineId(request.getMachineId());

        if (existingClient.isPresent()) {
            throw new IllegalArgumentException("Machine already registered");
        }

        String clientId = "agent_" + request.getMachineId();
        String clientSecret = generateSecureSecret();

        // Create and save OAuth client
        OAuthClient client = new OAuthClient();
        client.setClientId(clientId);
        client.setClientSecret(clientSecret);
        client.setMachineId(request.getMachineId());
        client.setGrantTypes(new String[]{"client_credentials"});
        client.setScopes(new String[]{
                "metrics:write",
                "agentgateway:proxy"
        });
        client.setRoles(new String[]{"AGENT"});

        oauthClientRepository.save(client);

        Machine machine = new Machine();
        machine.setMachineId(request.getMachineId());
        machine.setHostname(request.getHostname());
        machine.setIp(request.getIp());
        machine.setMacAddress(request.getMacAddress());
        machine.setOsUuid(request.getOsUuid());
        machine.setAgentVersion(request.getAgentVersion());
        machine.setLastSeen(Instant.now());
        machine.setStatus(DeviceStatus.ACTIVE);

        machineRepository.save(machine);

        return new AgentRegistrationResponse(clientId, clientSecret);
    }

    private String generateSecureSecret() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
