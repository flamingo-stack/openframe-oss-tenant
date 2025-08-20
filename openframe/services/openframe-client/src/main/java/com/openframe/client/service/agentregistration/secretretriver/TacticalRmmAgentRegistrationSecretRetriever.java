package com.openframe.client.service.agentregistration.secretretriver;

import com.openframe.sdk.tacticalrmm.TacticalRmmClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class TacticalRmmAgentRegistrationSecretRetriever implements ToolAgentRegistrationSecretRetriever{

    private final TacticalRmmClient tacticalRmmClient = null;


    @Override
    public String getToolId() {
        return "tactical-rmm";
    }

    @Override
    public String getSecret() {
        // TODO: ex processing
        try {
            return tacticalRmmClient.getInstallationSecret();
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
}
