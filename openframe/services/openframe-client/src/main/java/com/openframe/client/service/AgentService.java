package com.openframe.client.service;

import com.openframe.client.dto.agent.AgentRegistrationRequest;
import com.openframe.client.dto.agent.AgentRegistrationResponse;
import com.openframe.client.service.validator.AgentRegistrationSecretValidator;
import com.openframe.core.model.Machine;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.model.device.DeviceStatus;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentService {

    private final OAuthClientRepository oauthClientRepository;
    private final MachineRepository machineRepository;
    private final AgentRegistrationSecretValidator secretValidator;
    private final AgentSecretGenerator agentSecretGenerator;
    private final PasswordEncoder passwordEncoder;
    private final MachineIdGenerator machineIdGenerator;

    @Transactional
    public AgentRegistrationResponse registerAgent(String initialKey, AgentRegistrationRequest request) {
        secretValidator.validate(initialKey);

        String machineId = machineIdGenerator.generate();
        if (oauthClientRepository.existsByMachineId(machineId)) {
            log.error("Generated non unique machine id");
            throw new IllegalStateException("Failed to register client");
        }

        String clientId = "agent_" + machineId;
        String clientSecret = agentSecretGenerator.generate();

        // Create and save OAuth client
        OAuthClient client = new OAuthClient();
        client.setClientId(clientId);
        client.setClientSecret(passwordEncoder.encode(clientSecret));
        client.setMachineId(machineId);
        client.setGrantTypes(new String[]{"client_credentials"});
        client.setScopes(new String[]{
                "metrics:write",
                "agentgateway:proxy"
        });
        client.setRoles(new String[]{"AGENT"});

        oauthClientRepository.save(client);

        Machine machine = new Machine();
        machine.setMachineId(machineId);
        machine.setHostname(request.getHostname());
        machine.setIp(request.getIp());
        machine.setMacAddress(request.getMacAddress());
        machine.setOsUuid(request.getOsUuid());
        machine.setAgentVersion(request.getAgentVersion());
        machine.setLastSeen(Instant.now());
        machine.setStatus(DeviceStatus.ACTIVE);

        machineRepository.save(machine);

        return new AgentRegistrationResponse(machineId, clientId, clientSecret);
    }
}
