package com.openframe.client.controller;

import com.openframe.client.dto.AgentTokenResponse;
import com.openframe.client.service.AgentAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class AgentAuthController {
    private final AgentAuthService agentAuthService;

    @PostMapping(value = "/token", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getClientToken(
            @RequestParam String client_id,
            @RequestParam(required = false) String client_secret) {

        log.debug("Client token request - client_id: {}", client_id);

        try {
            AgentTokenResponse response = agentAuthService.issueClientToken(client_id, client_secret);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401)
                    .body(Map.of(
                            "error", "invalid_client",
                            "error_description", e.getMessage()
                    ));
        } catch (Exception e) {
            log.error("Token error: {}", e.getMessage(), e);
            return ResponseEntity.status(400)
                    .body(Map.of(
                            "error", "server_error",
                            "error_description", "An error occurred processing the request"
                    ));
        }
    }
}