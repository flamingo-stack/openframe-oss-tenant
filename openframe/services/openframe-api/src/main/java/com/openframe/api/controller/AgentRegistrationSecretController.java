package com.openframe.api.controller;

import java.util.List;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.openframe.api.dto.AgentRegistrationSecretResponse;
import com.openframe.data.model.mongo.AgentRegistrationSecret;
import com.openframe.api.service.AgentRegistrationSecretService;

import lombok.RequiredArgsConstructor;

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