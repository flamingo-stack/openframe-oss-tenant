package com.openframe.client.controller;

import com.openframe.sdk.tacticalrmm.TacticalRmmClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/tool")
public class ToolRegistrationSecretController {

    @Value("${openframe.integration.tactical-rmm.url:http://tactical-nginx.integrated-tools.svc.cluster.local:8000}")
    private String tacticalRmmBaseUrl;

    @GetMapping("/{toolId}/registration-secret")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> getRegistrationSecret(@PathVariable String toolId) {
        try {
            if ("tactical-rmm".equalsIgnoreCase(toolId)) {
                TacticalRmmClient client = new TacticalRmmClient(tacticalRmmBaseUrl);
                String secret = client.getInstallationSecret();
                if (secret == null) {
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration secret not found");
                }
                return Map.of("secret", secret);
            }

            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unsupported tool: " + toolId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Request interrupted while fetching registration secret", e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch registration secret", e);
        }
    }
}


