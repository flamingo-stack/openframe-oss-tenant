package com.openframe.client.service.agentregistration;

import com.openframe.client.dto.agent.AgentRegistrationRequest;
import com.openframe.client.dto.agent.AgentRegistrationResponse;
import com.openframe.client.service.validator.AgentRegistrationSecretValidator;
import com.openframe.data.document.device.DeviceStatus;
import com.openframe.data.document.device.DeviceType;
import com.openframe.data.document.device.Machine;
import com.openframe.data.document.oauth.OAuthClient;
import com.openframe.data.document.organization.Organization;
import com.openframe.data.repository.device.MachineRepository;
import com.openframe.data.repository.oauth.OAuthClientRepository;
import com.openframe.data.service.OrganizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static com.openframe.client.service.AgentAuthService.CLIENT_CREDENTIALS_GRANT_TYPE;
import static java.lang.String.format;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentRegistrationService {

    private static final String AGENT_ROLE = "AGENT";
    private static final String CLIENT_ID_TEMPLATE = "agent_%s";

    private final OAuthClientRepository oauthClientRepository;
    private final MachineRepository machineRepository;
    private final OrganizationService organizationService;
    private final AgentRegistrationSecretValidator secretValidator;
    private final AgentSecretGenerator agentSecretGenerator;
    private final PasswordEncoder passwordEncoder;
    private final MachineIdGenerator machineIdGenerator;
    private final AgentRegistrationToolService agentRegistrationToolService;

    @Transactional
    // TODO: two phase commit for the nats integration or other fallback
    public AgentRegistrationResponse register(String initialKey, AgentRegistrationRequest request) {
        secretValidator.validate(initialKey);

        String machineId = machineIdGenerator.generate();
        String clientId = buildClientId(machineId);
        String clientSecret = agentSecretGenerator.generate();

        // Get or resolve organization
        String resolvedOrganizationId = resolveOrganizationId(request.getOrganizationId());

        saveOAuthClient(machineId, clientId, clientSecret);
        saveMachine(machineId, request, resolvedOrganizationId);

        agentRegistrationToolService.publishInstallationMessages(machineId);

        return new AgentRegistrationResponse(machineId, clientId, clientSecret);
    }

    private void saveOAuthClient(String machineId, String clientId, String clientSecret) {
        if (oauthClientRepository.existsByMachineId(machineId)) {
            log.error("Generated non unique machine id {}", machineId);
            throw new IllegalStateException("Failed to register client");
        }

        OAuthClient client = new OAuthClient();
        client.setClientId(clientId);
        client.setClientSecret(passwordEncoder.encode(clientSecret));
        client.setMachineId(machineId);
        client.setGrantTypes(new String[]{CLIENT_CREDENTIALS_GRANT_TYPE});
        client.setRoles(new String[]{AGENT_ROLE});

        oauthClientRepository.save(client);
    }

    private String buildClientId(String machineId) {
        return format(CLIENT_ID_TEMPLATE, machineId);
    }

    /**
     * Resolve organization ID for the machine.
     * If provided organizationId exists, use it.
     * Otherwise, fallback to default organization.
     * 
     * @param requestedOrganizationId organizationId from registration request (can be null)
     * @return resolved organizationId to use
     */
    private String resolveOrganizationId(String requestedOrganizationId) {
        // If organizationId provided, check if it exists
        if (requestedOrganizationId != null && !requestedOrganizationId.isBlank()) {
            boolean exists = organizationService.getOrganizationByOrganizationId(requestedOrganizationId)
                    .isPresent();
            
            if (exists) {
                log.debug("Using provided organizationId: {}", requestedOrganizationId);
                return requestedOrganizationId;
            } else {
                log.warn("Provided organizationId {} not found, falling back to default", requestedOrganizationId);
            }
        }
        
        // Fallback to default organization
        String defaultOrgId = getDefaultOrganizationId();
        log.debug("Using default organizationId: {}", defaultOrgId);
        return defaultOrgId;
    }

    /**
     * Get default organization ID.
     * Returns organizationId of the organization with name {@link OrganizationService#DEFAULT_ORGANIZATION_NAME}.
     * 
     * @return default organization ID
     * @throws IllegalStateException if default organization doesn't exist
     */
    private String getDefaultOrganizationId() {
        return organizationService.getDefaultOrganization()
                .map(Organization::getOrganizationId)
                .orElseThrow(() -> new IllegalStateException(
                        "Default organization not found. Please ensure it was created during tenant registration."));
    }

    private void saveMachine(String machineId, AgentRegistrationRequest request, String organizationId) {
        Machine machine = new Machine();
        machine.setMachineId(machineId);
        machine.setHostname(request.getHostname());
        machine.setIp(request.getIp());
        machine.setMacAddress(request.getMacAddress());
        machine.setOsType(request.getOsType());
        machine.setOsUuid(request.getOsUuid());
        machine.setAgentVersion(request.getAgentVersion());
        machine.setLastSeen(Instant.now());
        machine.setStatus(DeviceStatus.ACTIVE);
        machine.setOrganizationId(organizationId);
        machine.setType(DeviceType.DESKTOP);

        machineRepository.save(machine);
        
        log.info("Saved machine {} with organizationId: {}", machineId, organizationId);
    }

}
