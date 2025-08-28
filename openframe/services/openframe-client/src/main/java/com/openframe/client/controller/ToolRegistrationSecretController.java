package com.openframe.client.controller;

import com.openframe.client.service.agentregistration.secretretriver.FleetMdmAgentRegistrationSecretRetriever;
import com.openframe.client.service.agentregistration.secretretriver.TacticalRmmAgentRegistrationSecretRetriever;
import com.openframe.sdk.tacticalrmm.TacticalRmmClient;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
// TODO: remove
public class ToolRegistrationSecretController {

    private final TacticalRmmAgentRegistrationSecretRetriever secretRetriever;
    private final FleetMdmAgentRegistrationSecretRetriever fleetMdmSecretRetriever;

    @GetMapping("/{toolId}/registration-secret")
    @ResponseStatus(HttpStatus.OK)
    public String getRegistrationSecret(@PathVariable String toolId) {
        if (toolId.equals("tactical-rmm")) {
            return secretRetriever.getSecret();
        } else if (toolId.equals("fleetmdm-server")) {
            return fleetMdmSecretRetriever.getSecret();
        }
        return "Failed";
    }
}


