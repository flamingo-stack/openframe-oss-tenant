package com.openframe.api.controller;

import com.openframe.api.dto.AgentRegistrationSecretResponse;
import com.openframe.api.service.AgentRegistrationSecretService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/agent/registration-secret")
@RequiredArgsConstructor
@Slf4j
public class AgentRegistrationSecretController {
    
    private final AgentRegistrationSecretService secretService;

    @GetMapping("/active")
    public AgentRegistrationSecretResponse getActiveSecret() {
        return secretService.getActiveSecret();
    }

    @GetMapping
    public List<AgentRegistrationSecretResponse> getAllSecrets() {
        return secretService.getAllSecrets();
    }

    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public AgentRegistrationSecretResponse generateNewSecret() {
        log.info("Generating new agent registration key");
        return secretService.generateNewSecret();
    }
} 