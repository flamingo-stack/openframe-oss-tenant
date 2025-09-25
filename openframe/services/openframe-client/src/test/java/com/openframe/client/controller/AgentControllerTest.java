package com.openframe.client.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.client.exception.*;
import com.openframe.client.service.agentregistration.AgentRegistrationService;
import com.openframe.client.util.TestAuthenticationManager;
import com.openframe.client.dto.agent.*;
import com.openframe.client.service.ToolConnectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

import java.util.Arrays;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.argThat;

@ExtendWith(MockitoExtension.class)
class AgentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AgentRegistrationService agentRegistrationService;

    private AgentRegistrationRequest registrationRequest;
    private AgentRegistrationResponse registrationResponse;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setup() {
        AgentController controller = new AgentController(agentRegistrationService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .addFilter(new BasicAuthenticationFilter(new TestAuthenticationManager()))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        setupTestData();
    }

    private void setupTestData() {
        registrationRequest = new AgentRegistrationRequest();
        registrationRequest.setHostname("test-host");
        registrationRequest.setIp("192.168.1.1");
        registrationRequest.setMacAddress("00:11:22:33:44:55");
        registrationRequest.setOsUuid("test-os-uuid");
        registrationRequest.setAgentVersion("1.0.0");
        registrationResponse = new AgentRegistrationResponse("test-machine-id", "client-id", "client-secret");
    }

    @Test
    void register_WithValidRequest_ReturnsOk() throws Exception {
        when(agentRegistrationService.register(any(), any())).thenReturn(registrationResponse);

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value("test-machine-id"))
                .andExpect(jsonPath("$.clientId").value("client-id"))
                .andExpect(jsonPath("$.clientSecret").value("client-secret"));
    }

    @Test
    void register_MissingHeader_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/agents/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_request"))
                .andExpect(jsonPath("$.message").value("Required header 'X-Initial-Key' is missing"));
    }

    @Test
    void register_WithoutInitialKey_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/agents/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_request"))
                .andExpect(jsonPath("$.message").value("Required header 'X-Initial-Key' is missing"));
    }

    @Test
    void register_WithInvalidInitialKey_ReturnsUnauthorized() throws Exception {
        when(agentRegistrationService.register(any(String.class), any(AgentRegistrationRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid initial key"));

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "invalid-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid initial key"));
    }

    @Test
    void register_WithDuplicateMachineId_ReturnsConflict() throws Exception {
        when(agentRegistrationService.register(eq("test-key"), any(AgentRegistrationRequest.class)))
                .thenThrow(new DuplicateConnectionException("Machine already registered"));

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("conflict"))
                .andExpect(jsonPath("$.message").value("Machine already registered"));
    }

    @Test
    void register_WithValidRequest_ReturnsCredentials() throws Exception {
        when(agentRegistrationService.register(eq("test-key"), any(AgentRegistrationRequest.class)))
                .thenReturn(registrationResponse);

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientId").value("client-id"))
                .andExpect(jsonPath("$.clientSecret").value("client-secret"));
    }

    @Test
    void register_WithValidRequest_StoresAgentInfo() throws Exception {
        when(agentRegistrationService.register(eq("test-key"), any(AgentRegistrationRequest.class)))
                .thenReturn(registrationResponse);

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isOk());

        verify(agentRegistrationService).register(
                eq("test-key"),
                argThat(request ->
                                request.getHostname().equals("test-host") &&
                                request.getIp().equals("192.168.1.1") &&
                                request.getMacAddress().equals("00:11:22:33:44:55") &&
                                request.getOsUuid().equals("test-os-uuid") &&
                                request.getAgentVersion().equals("1.0.0")
                )
        );
    }
}