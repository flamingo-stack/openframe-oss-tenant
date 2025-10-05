package com.openframe.client.service.agentregistration.transformer;

import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.tool.ToolType;
import com.openframe.data.document.tool.ToolUrl;
import com.openframe.data.document.tool.ToolUrlType;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.data.service.ToolUrlService;
import com.openframe.sdk.fleetmdm.FleetMdmClient;
import com.openframe.sdk.fleetmdm.model.Host;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

@Component
@RequiredArgsConstructor
@Slf4j
public class FleetMdmAgentIdTransformer implements ToolAgentIdTransformer {

    private static final String TOOL_ID = "fleetmdm-server";

    private final IntegratedToolService integratedToolService;
    private final ToolUrlService toolUrlService;

    @Override
    public ToolType getToolType() {
        return ToolType.FLEET_MDM;
    }

    // TODO: have normal fleet mdm openframe sdk that get url and api key from the box. Use it here and at other places.
    @Override
    public String transform(String agentToolId) {
        if (isBlank(agentToolId)) {
            log.warn("Agent tool ID is blank for Fleet MDM");
            return agentToolId;
        }

        try {
            // Get the integrated tool configuration
            IntegratedTool integratedTool = integratedToolService.getToolById(TOOL_ID)
                    .orElseThrow(() -> new IllegalStateException("Found no tool with id " + TOOL_ID));
            
            ToolUrl toolUrl = toolUrlService.getUrlByToolType(integratedTool, ToolUrlType.API)
                    .orElseThrow(() -> new IllegalStateException("Found no api url for tool with id " + TOOL_ID));

            String apiUrl = toolUrl.getUrl() + ":" + toolUrl.getPort();
            String apiToken = integratedTool.getCredentials().getApiKey().getKey();

            // Create Fleet MDM client
            FleetMdmClient fleetClient = new FleetMdmClient(apiUrl, apiToken);
            
            // Search for hosts with the UUID, limit to 2 as requested
            List<Host> hosts = fleetClient.searchHosts(agentToolId, 0, 2);
            
            if (hosts.isEmpty()) {
                log.warn("No hosts found in Fleet MDM for UUID: {}", agentToolId);
                return agentToolId;
            }
            
            // Filter hosts: exact UUID match and non-empty osquery version
            Host matchingHost = hosts.stream()
                .filter(host -> agentToolId.equals(host.getUuid()))
                .filter(host -> isNotBlank(host.getOsVersion())) // osquery version is not empty
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No valid fleet mdm host found with uuid=" + agentToolId));
            
            String transformedAgentToolId = String.valueOf(matchingHost.getId());
            log.info("Transformed Fleet MDM agent tool ID from UUID {} to host ID {}", agentToolId, transformedAgentToolId);
            
            return transformedAgentToolId;
        } catch (Exception e) {
            log.error("Failed to transform Fleet MDM agent tool ID: {}", agentToolId, e);
            throw new IllegalStateException("Failed to transform Fleet MDM agent tool ID", e);
        }
    }
}
