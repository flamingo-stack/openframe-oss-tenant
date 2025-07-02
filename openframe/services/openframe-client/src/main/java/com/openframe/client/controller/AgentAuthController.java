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
            @RequestParam(name = "grant_type") String grantType,
            @RequestParam(name = "refresh_token", required = false) String refreshToken,
            @RequestParam(name = "client_id", required = false) String clientId,
            @RequestParam(name = "client_secret", required = false) String clientSecret) {

        log.debug("Client token request - client_id: {}", clientId);

        try {
            AgentTokenResponse response = agentAuthService.issueClientToken(grantType, refreshToken, clientId, clientSecret);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401)
                    .body(Map.of(
                            "message", e.getMessage()
                    ));
        } catch (Exception e) {
            log.error("Token issue error: {}", e.getMessage(), e);
            return ResponseEntity.status(400)
                    .body(Map.of(
                            "error", "server_error",
                            "error_description", "An error occurred processing the request"
                    ));
        }
    }
}