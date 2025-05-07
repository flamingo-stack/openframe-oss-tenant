package com.openframe.client.controller;

import com.openframe.client.dto.AgentTokenResponse;
import com.openframe.client.service.AgentAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class AgentAuthController {
    private final AgentAuthService agentAuthService;

    @PostMapping("/token")
    public ResponseEntity<?> token(
            @RequestParam String grant_type,
            @RequestParam String client_id,
            @RequestParam String client_secret) {
        if (!"client_credentials".equals(grant_type)) {
            return ResponseEntity.badRequest().body("Unsupported grant_type");
        }
        try {
            AgentTokenResponse response = agentAuthService.authenticateAndIssueToken(client_id, client_secret);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
    }
} 