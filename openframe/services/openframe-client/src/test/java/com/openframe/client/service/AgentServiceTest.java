package com.openframe.client.service;

import com.openframe.client.dto.agent.AgentRegistrationRequest;
import com.openframe.client.dto.agent.AgentRegistrationResponse;
import com.openframe.client.service.validator.AgentRegistrationSecretValidator;
import com.openframe.core.model.Machine;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.model.device.DeviceStatus;
import com.openframe.core.service.SecretGenerator;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgentServiceTest {

    @Mock
    private OAuthClientRepository oauthClientRepository;

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private AgentRegistrationSecretValidator agentRegistrationSecretValidator;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SecretGenerator secretGenerator;

    @Captor
    private ArgumentCaptor<OAuthClient> oauthClientCaptor;

    @Captor
    private ArgumentCaptor<Machine> machineCaptor;

    private AgentService agentService;
    private AgentRegistrationRequest request;
    private static final String INITIAL_KEY = "test-initial-key";
    private static final String MACHINE_ID = "test-machine-id";
    private static final String CLIENT_SECRET = "01234567890123456789012345678912";

    @BeforeEach
    void setUp() {
        agentService = new AgentService(oauthClientRepository, machineRepository, agentRegistrationSecretValidator, secretGenerator, passwordEncoder);
        request = createTestRequest();
    }

    @Test
    void registerAgent_WithNewMachine_ReturnsCredentials() {
        when(oauthClientRepository.existsByMachineId(MACHINE_ID)).thenReturn(false);
        when(secretGenerator.generate(32)).thenReturn(CLIENT_SECRET);
        when(oauthClientRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);
        when(machineRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);
        AgentRegistrationResponse response = agentService.registerAgent(INITIAL_KEY, request);
        assertNotNull(response);
        assertEquals("agent_" + MACHINE_ID, response.getClientId());
        assertNotNull(response.getClientSecret());
        assertEquals(CLIENT_SECRET, response.getClientSecret());

        verify(oauthClientRepository).save(oauthClientCaptor.capture());
        OAuthClient savedClient = oauthClientCaptor.getValue();
        assertEquals(MACHINE_ID, savedClient.getMachineId());
        assertEquals("agent_" + MACHINE_ID, savedClient.getClientId());
        assertArrayEquals(new String[]{"client_credentials"}, savedClient.getGrantTypes());
        assertArrayEquals(new String[]{"metrics:write",
                "agentgateway:proxy"}, savedClient.getScopes());

        verify(machineRepository).save(machineCaptor.capture());
        Machine savedMachine = machineCaptor.getValue();
        assertEquals(MACHINE_ID, savedMachine.getMachineId());
        assertEquals("test-hostname", savedMachine.getHostname());
        assertEquals("192.168.1.1", savedMachine.getIp());
        assertEquals("00:11:22:33:44:55", savedMachine.getMacAddress());
        assertEquals("test-os-uuid", savedMachine.getOsUuid());
        assertEquals("1.0.0", savedMachine.getAgentVersion());
        assertEquals(DeviceStatus.ACTIVE, savedMachine.getStatus());
        assertNotNull(savedMachine.getLastSeen());
    }

    @Test
    void registerAgent_WithExistingMachine_ThrowsException() {
        when(oauthClientRepository.existsByMachineId(MACHINE_ID)).thenReturn(true);
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> agentService.registerAgent(INITIAL_KEY, request)
        );
        assertEquals("Machine already registered", exception.getMessage());

        verify(oauthClientRepository, never()).save(any());
        verify(machineRepository, never()).save(any());
    }

    private AgentRegistrationRequest createTestRequest() {
        return createTestRequest(MACHINE_ID);
    }

    private AgentRegistrationRequest createTestRequest(String machineId) {
        AgentRegistrationRequest request = new AgentRegistrationRequest();
        request.setMachineId(machineId);
        request.setHostname("test-hostname");
        request.setIp("192.168.1.1");
        request.setMacAddress("00:11:22:33:44:55");
        request.setOsUuid("test-os-uuid");
        request.setAgentVersion("1.0.0");
        return request;
    }
} 