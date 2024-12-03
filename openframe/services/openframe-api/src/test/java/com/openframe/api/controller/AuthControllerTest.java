package com.openframe.api.controller;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.api.config.SecurityTestConfig;
import com.openframe.api.config.TestConfig;
import com.openframe.api.dto.AuthRequest;
import com.openframe.api.dto.AuthResponse;
import com.openframe.api.dto.RegisterRequest;
import com.openframe.api.service.AuthenticationService;
import com.openframe.api.repository.UserRepository;
import com.openframe.api.service.JwtService;

import org.springframework.security.authentication.AuthenticationManager;

import com.openframe.data.repository.UserRepository;

import org.springframework.data.mongodb.core.MongoTemplate;

import com.openframe.api.service.EventService;
import com.openframe.data.config.MongoIndexConfig;

@WebMvcTest(controllers = AuthController.class)
@Import({SecurityTestConfig.class})
@ActiveProfiles("test")
@TestPropertySource( 
    properties = {
        "spring.main.allow-bean-definition-overriding=true"
    }
)
@MockBean(MongoIndexConfig.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthenticationService authenticationService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private AuthenticationManager authenticationManager;

    @MockBean
    private EventService eventService;

    @MockBean
    private MongoTemplate mongoTemplate;

    @Test
    void register_ValidRequest_ReturnsToken() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setEmail("test@example.com");
        request.setPassword("Password123!");

        when(authenticationService.register(any()))
                .thenReturn(new AuthResponse("test-token"));

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("test-token"));
    }

    @Test
    void register_InvalidRequest_ReturnsBadRequest() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(""); // Invalid username
        request.setEmail("invalid-email"); // Invalid email
        request.setPassword("weak"); // Invalid password

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void authenticate_ValidCredentials_ReturnsToken() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setUsername("testuser");
        request.setPassword("Password123!");

        when(authenticationService.authenticate(any()))
                .thenReturn(new AuthResponse("test-token"));

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("test-token"));
    }

    @Test
    @WithMockUser
    void authenticate_InvalidRequest_ReturnsBadRequest() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setUsername("");
        request.setPassword("");

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
