package com.openframe.client.service.agentregistration.secretretriver;

import com.openframe.core.model.IntegratedTool;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.data.service.ToolUrlService;
import com.openframe.sdk.tacticalrmm.TacticalRmmClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class TacticalRmmAgentRegistrationSecretRetriever implements ToolAgentRegistrationSecretRetriever{

    @Override
    public String getToolId() {
        return "tactical-rmm";
    }

    @Override
    public String getSecret() {
        // TODO: ex processing
        try {
            // TODO: improve
            TacticalRmmClient client = new TacticalRmmClient("http://tactical-nginx.integrated-tools.svc.cluster.local:8000");
            return client.getInstallationSecret();
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
}
