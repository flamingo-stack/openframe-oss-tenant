package com.openframe.client.service.agentregistration.secretretriver;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolUrl;
import com.openframe.core.model.ToolUrlType;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.data.service.ToolUrlService;
import com.openframe.sdk.fleetmdm.FleetMdmClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class FleetMdmAgentRegistrationSecretRetriever implements ToolAgentRegistrationSecretRetriever {

    private final IntegratedToolService integratedToolService;
    private final ToolUrlService toolUrlService;

    @Override
    public String getToolId() {
        return "fleetmdm-server";
    }

    @Override
    public String getSecret() {
        try {
            // Get the integrated tool configuration
            IntegratedTool integratedTool = integratedToolService.getToolById(getToolId())
                    .orElseThrow(() -> new RuntimeException("Fleet MDM tool not found"));
            
            ToolUrl toolUrl = toolUrlService.getUrlByToolType(integratedTool, ToolUrlType.API)
                    .orElseThrow(() -> new RuntimeException("Fleet MDM API URL not found"));

            // Build the API URL
            String apiUrl = toolUrl.getUrl() + ":" + toolUrl.getPort();

            // Get the API token
            String apiToken = integratedTool.getCredentials().getApiKey().getKey();

            // Create Fleet MDM client and get enroll secret
            FleetMdmClient client = new FleetMdmClient(apiUrl, apiToken);
            String enrollSecret = client.getEnrollSecret();
            
            if (enrollSecret == null) {
                throw new RuntimeException("Failed to retrieve enroll secret from Fleet MDM");
            }
            
            log.info("Successfully retrieved enroll secret from Fleet MDM");
            return enrollSecret;
            
        } catch (IOException e) {
            log.error("IO error while retrieving Fleet MDM enroll secret", e);
            throw new RuntimeException("Failed to retrieve Fleet MDM enroll secret due to IO error", e);
        } catch (InterruptedException e) {
            log.error("Request interrupted while retrieving Fleet MDM enroll secret", e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve Fleet MDM enroll secret due to interruption", e);
        } catch (Exception e) {
            log.error("Unexpected error while retrieving Fleet MDM enroll secret", e);
            throw new RuntimeException("Failed to retrieve Fleet MDM enroll secret", e);
        }
    }
}
