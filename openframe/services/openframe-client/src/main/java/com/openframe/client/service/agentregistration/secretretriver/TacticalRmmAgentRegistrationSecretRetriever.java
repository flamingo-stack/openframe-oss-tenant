package com.openframe.client.service.agentregistration.secretretriver;

import com.openframe.client.dto.agent.AgentRegistrationRequest;
import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolType;
import com.openframe.core.model.ToolUrl;
import com.openframe.core.model.ToolUrlType;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.data.service.ToolUrlService;
import com.openframe.sdk.tacticalrmm.TacticalRmmClient;
import com.openframe.sdk.tacticalrmm.model.AgentRegistrationSecretRequest;
import lombok.RequiredArgsConstructor;
import org.checkerframework.checker.units.qual.A;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class TacticalRmmAgentRegistrationSecretRetriever implements ToolAgentRegistrationSecretRetriever{

    private final IntegratedToolService integratedToolService;
    private final ToolUrlService toolUrlService;
    private final TacticalRmmClient client;

    @Override
    public String getToolId() {
        // TODO: tool type enum
        return "tactical-rmm";
    }

    @Override
    public String getSecret() {
        // TODO: normal exception
        // TODO: tool type
        IntegratedTool integratedTool = integratedToolService.getToolById(getToolId())
                .orElseThrow();
        ToolUrl toolUrl = toolUrlService.getUrlByToolType(integratedTool, ToolUrlType.API)
                .orElseThrow();

        // TODO: improve
        String apiUrl = toolUrl.getUrl() + ":" + toolUrl.getPort();

        String apiKey = integratedTool.getCredentials().getApiKey().getKey();

        AgentRegistrationSecretRequest request = buildRequest(apiUrl);
        return client.getInstallationSecret(apiUrl, apiKey, request);
    }

    private AgentRegistrationSecretRequest buildRequest(String apiUrl) {
        AgentRegistrationSecretRequest request = new AgentRegistrationSecretRequest();
        request.setInstallMethod("manual");
        request.setClient(1);
        request.setSite(1);
        request.setExpires(2400);
        request.setAgentType("server");
        request.setPower(0);
        request.setRdp(0);
        request.setPing(0);
        request.setGoarch("amd64");
        request.setApi(apiUrl);
        request.setFileName("trmm-defaultorganization-defaultsite-server-amd64.exe");
        request.setPlatform("windows");
        return request;
    }

}
