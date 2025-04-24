package com.openframe.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.api.dto.agent.*;
import com.openframe.api.exception.GlobalExceptionHandler;
import com.openframe.api.service.AgentService;
import com.openframe.api.service.ToolConnectionService;
import com.openframe.api.util.TestAuthenticationManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class AgentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AgentService agentService;

    @Mock
    private ToolConnectionService toolConnectionService;

    private static final String OPENFRAME_AGENT_ID = "test-agent-id";
    private static final String TOOL_TYPE = "test-tool-type";
    private static final String AGENT_TOOL_ID = "test-remote-agent-id";

    private AgentRegistrationRequest registrationRequest;
    private AgentRegistrationResponse registrationResponse;
    private ToolConnectionRequest toolConnectionRequest;
    private ToolConnectionResponse toolConnectionResponse;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setup() {
        AgentController controller = new AgentController(agentService, toolConnectionService);

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
        registrationRequest.setMachineId("test-machine");
        registrationRequest.setHostname("test-host");
        registrationRequest.setIp("192.168.1.1");
        registrationRequest.setMacAddress("00:11:22:33:44:55");
        registrationRequest.setOsUuid("test-os-uuid");
        registrationRequest.setAgentVersion("1.0.0");

        registrationResponse = new AgentRegistrationResponse("client-id", "client-secret");

        toolConnectionRequest = new ToolConnectionRequest();
        toolConnectionRequest.setOpenframeAgentId(OPENFRAME_AGENT_ID);
        toolConnectionRequest.setToolType(TOOL_TYPE);
        toolConnectionRequest.setAgentToolId(AGENT_TOOL_ID);

        toolConnectionResponse = new ToolConnectionResponse();
        toolConnectionResponse.setOpenframeAgentId(OPENFRAME_AGENT_ID);
        toolConnectionResponse.setToolType(TOOL_TYPE);
        toolConnectionResponse.setAgentToolId(AGENT_TOOL_ID);
        toolConnectionResponse.setStatus("CONNECTED");
    }

    @Test
    void registerAgent_WithValidRequest_ReturnsOk() throws Exception {
        when(agentService.registerAgent(any(), any())).thenReturn(registrationResponse);

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientId").value("client-id"))
                .andExpect(jsonPath("$.clientSecret").value("client-secret"));
    }

    @Test
    @WithAnonymousUser
    void anonymousAccess_Returns401() throws Exception {
        when(toolConnectionService.getAllToolConnections())
                .thenThrow(new AccessDeniedException("Access is denied"));

        mockMvc.perform(get("/api/agents/tool-connections"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void userCanAccessToolConnections() throws Exception {
        when(toolConnectionService.getAllToolConnections())
                .thenReturn(Arrays.asList(toolConnectionResponse));

        mockMvc.perform(get("/api/agents/tool-connections"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].openframeAgentId").value(OPENFRAME_AGENT_ID))
                .andExpect(jsonPath("$[0].toolType").value(TOOL_TYPE))
                .andExpect(jsonPath("$[0].agentToolId").value(AGENT_TOOL_ID))
                .andExpect(jsonPath("$[0].status").value("CONNECTED"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void userCanAddToolConnection() throws Exception {
        when(toolConnectionService.addToolConnection(
                eq(OPENFRAME_AGENT_ID),
                eq(TOOL_TYPE),
                eq(AGENT_TOOL_ID)))
                .thenReturn(toolConnectionResponse);

        mockMvc.perform(post("/api/agents/tool-connection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toolConnectionRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.openframeAgentId").value(OPENFRAME_AGENT_ID))
                .andExpect(jsonPath("$.toolType").value(TOOL_TYPE))
                .andExpect(jsonPath("$.agentToolId").value(AGENT_TOOL_ID));
    }

    @Test
    @WithMockUser(roles = "USER")
    void userCanUpdateToolConnection() throws Exception {
        when(toolConnectionService.updateToolConnection(
                eq(OPENFRAME_AGENT_ID),
                eq(TOOL_TYPE),
                eq(AGENT_TOOL_ID)))
                .thenReturn(Optional.of(toolConnectionResponse));

        mockMvc.perform(put("/api/agents/tool-connections/{openframeAgentId}/{toolType}",
                        OPENFRAME_AGENT_ID, TOOL_TYPE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toolConnectionRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openframeAgentId").value(OPENFRAME_AGENT_ID))
                .andExpect(jsonPath("$.toolType").value(TOOL_TYPE))
                .andExpect(jsonPath("$.agentToolId").value(AGENT_TOOL_ID));
    }

    @Test
    @WithMockUser(roles = "USER")
    void userCanDeleteToolConnection() throws Exception {
        mockMvc.perform(delete("/api/agents/tool-connections/{openframeAgentId}/{toolType}",
                        OPENFRAME_AGENT_ID, TOOL_TYPE))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "USER")
    void getToolConnectionsByMachineId_WithUserRole_ReturnsOk() throws Exception {
        when(toolConnectionService.getToolConnectionsByMachineId(OPENFRAME_AGENT_ID))
                .thenReturn(Arrays.asList(toolConnectionResponse));

        mockMvc.perform(get("/api/agents/tool-connections/{openframeAgentId}", OPENFRAME_AGENT_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].openframeAgentId").value(OPENFRAME_AGENT_ID))
                .andExpect(jsonPath("$[0].toolType").value(TOOL_TYPE))
                .andExpect(jsonPath("$[0].status").value("CONNECTED"));
    }

    @Test
    @WithMockUser
    void getToolConnectionsByMachineId_WhenEmpty_ReturnsEmptyArray() throws Exception {
        when(toolConnectionService.getToolConnectionsByMachineId(OPENFRAME_AGENT_ID))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/agents/tool-connections/{openframeAgentId}", OPENFRAME_AGENT_ID)
                        .requestAttr("org.springframework.security.test.context.support.WithMockUser", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void addToolConnection_WithInvalidRequest_ReturnsBadRequest() throws Exception {
        ToolConnectionRequest invalidRequest = new ToolConnectionRequest();

        mockMvc.perform(post("/api/agents/tool-connection")
                        .requestAttr("org.springframework.security.test.context.support.WithMockUser", "true")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerAgent_MissingHeader_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/agents/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_request"))
                .andExpect(jsonPath("$.message").value("Required header 'X-Initial-Key' is missing"));
    }


    @Test
    @WithMockUser(roles = "USER")
    void accessWithUserRole_Succeeds() throws Exception {
        when(toolConnectionService.getAllToolConnections())
                .thenReturn(Arrays.asList(toolConnectionResponse));

        mockMvc.perform(get("/api/agents/tool-connections")
                        .requestAttr("org.springframework.security.test.context.support.WithMockUser", "true"))
                .andExpect(status().isOk());
    }

    @Test
    void registerAgent_WithoutInitialKey_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/agents/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_request"))
                .andExpect(jsonPath("$.message").value("Required header 'X-Initial-Key' is missing"));
    }

    @Test
    void registerAgent_WithInvalidInitialKey_ReturnsUnauthorized() throws Exception {
        when(agentService.registerAgent(any(String.class), any(AgentRegistrationRequest.class)))
            .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Invalid initial key"));

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "invalid-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid initial key"));
    }

    @Test
    void registerAgent_WithMissingRequiredFields_ReturnsBadRequest() throws Exception {
        AgentRegistrationRequest invalidRequest = new AgentRegistrationRequest();

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_request"))
                .andExpect(jsonPath("$.message").value("Machine ID is required"));
    }

    @Test
    void registerAgent_WithDuplicateMachineId_ReturnsConflict() throws Exception {
        when(agentService.registerAgent(eq("test-key"), any(AgentRegistrationRequest.class)))
                .thenThrow(new IllegalArgumentException("Machine already registered"));

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("conflict"))
                .andExpect(jsonPath("$.message").value("Machine already registered"));
    }

    @Test
    void registerAgent_WithValidRequest_ReturnsCredentials() throws Exception {
        when(agentService.registerAgent(eq("test-key"), any(AgentRegistrationRequest.class)))
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
    void registerAgent_WithValidRequest_StoresAgentInfo() throws Exception {
        when(agentService.registerAgent(eq("test-key"), any(AgentRegistrationRequest.class)))
                .thenReturn(registrationResponse);

        mockMvc.perform(post("/api/agents/register")
                        .header("X-Initial-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registrationRequest)))
                .andExpect(status().isOk());

        verify(agentService).registerAgent(
                eq("test-key"),
                argThat(request -> 
                    request.getMachineId().equals("test-machine") &&
                    request.getHostname().equals("test-host") &&
                    request.getIp().equals("192.168.1.1") &&
                    request.getMacAddress().equals("00:11:22:33:44:55") &&
                    request.getOsUuid().equals("test-os-uuid") &&
                    request.getAgentVersion().equals("1.0.0")
                )
        );
    }

    @Test
    @WithMockUser(roles = "USER")
    void getToolConnectionByMachineIdAndToolType_WhenExists_ReturnsOk() throws Exception {
        when(toolConnectionService.getToolConnectionByMachineIdAndToolType(OPENFRAME_AGENT_ID, TOOL_TYPE))
                .thenReturn(Optional.of(toolConnectionResponse));

        mockMvc.perform(get("/api/agents/tool-connections/{openframeAgentId}/{toolType}", 
                        OPENFRAME_AGENT_ID, TOOL_TYPE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openframeAgentId").value(OPENFRAME_AGENT_ID))
                .andExpect(jsonPath("$.toolType").value(TOOL_TYPE))
                .andExpect(jsonPath("$.agentToolId").value(AGENT_TOOL_ID))
                .andExpect(jsonPath("$.status").value("CONNECTED"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void getToolConnectionByMachineIdAndToolType_WhenNotFound_Returns404() throws Exception {
        when(toolConnectionService.getToolConnectionByMachineIdAndToolType(OPENFRAME_AGENT_ID, TOOL_TYPE))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/agents/tool-connections/{openframeAgentId}/{toolType}", 
                        OPENFRAME_AGENT_ID, TOOL_TYPE))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "USER")
    void updateToolConnection_WhenNotFound_Returns404() throws Exception {
        when(toolConnectionService.updateToolConnection(
                eq(OPENFRAME_AGENT_ID),
                eq(TOOL_TYPE),
                eq(AGENT_TOOL_ID)))
                .thenReturn(Optional.empty());

        mockMvc.perform(put("/api/agents/tool-connections/{openframeAgentId}/{toolType}",
                        OPENFRAME_AGENT_ID, TOOL_TYPE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toolConnectionRequest)))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "USER")
    void deleteToolConnection_WhenNotFound_Returns404() throws Exception {
        doThrow(new IllegalArgumentException("Connection not found"))
                .when(toolConnectionService)
                .deleteToolConnection(OPENFRAME_AGENT_ID, TOOL_TYPE);

        mockMvc.perform(delete("/api/agents/tool-connections/{openframeAgentId}/{toolType}",
                        OPENFRAME_AGENT_ID, TOOL_TYPE))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("not_found"))
                .andExpect(jsonPath("$.message").value("Connection not found"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void getToolConnectionByMachineIdAndToolType_WithInvalidParameters_ReturnsBadRequest() throws Exception {
        when(toolConnectionService.getToolConnectionByMachineIdAndToolType(eq("invalid-id"), any()))
                .thenThrow(new IllegalArgumentException("Invalid agent ID"));

        mockMvc.perform(get("/api/agents/tool-connections/{openframeAgentId}/{toolType}", 
                        "invalid-id", TOOL_TYPE))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_request"))
                .andExpect(jsonPath("$.message").value("Invalid agent ID"));
    }

    @Test
    @WithAnonymousUser
    void getToolConnectionByMachineIdAndToolType_WithoutAuth_Returns401() throws Exception {
        when(toolConnectionService.getToolConnectionByMachineIdAndToolType(any(), any()))
                .thenThrow(new AccessDeniedException("Access is denied"));

        mockMvc.perform(get("/api/agents/tool-connections/{openframeAgentId}/{toolType}", 
                        OPENFRAME_AGENT_ID, TOOL_TYPE))
                .andExpect(status().isUnauthorized());
    }
}