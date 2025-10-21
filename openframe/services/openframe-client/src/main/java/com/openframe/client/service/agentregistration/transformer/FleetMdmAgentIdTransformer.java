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
import org.springframework.security.core.parameters.P;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

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

    // TODO: have normal fleetmdm-agent mdm openframe sdk that get url and api key from the box.
    //  Use it here and at other places.
    // TODO: revise logic or full architecture:
    @Override
    public String transform(String agentToolId, boolean lastAttempt) {
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
                throw new IllegalStateException("No hosts found in Fleet MDM for UUID: " + agentToolId);
            }
            logHosts(hosts);

            // Filter hosts: exact UUID match and non-empty os data
            Optional<Host> matchingHost = hosts.stream()
                    .filter(host -> agentToolId.equals(host.getUuid()))
                    .filter(host -> isNotBlank(host.getOsVersion()) || isNotBlank(host.getOsqueryVersion()))
                    .findFirst();

            if (matchingHost.isPresent()) {
                String transformedAgentToolId = String.valueOf(matchingHost.get().getId());
                log.info("Transformed Fleet MDM agent tool ID from UUID {} to host ID {}", agentToolId, transformedAgentToolId);
                return transformedAgentToolId;
            } else {
                if (!lastAttempt) {
                    throw new IllegalStateException("No valid fleetmdm-agent mdm host found with uuid=" + agentToolId);
                } else {
                    log.info("Process last attempt for uuid {}", agentToolId);
                    if (hosts.size() != 1) {
                        log.info("Use max host id strategy");
                        Long maxHostId = hosts.stream()
                                .map(Host::getId)
                                .max(Long::compareTo)
                                .orElseThrow(() -> new IllegalStateException("System error during max host id lookup"));
                        String transformedAgentToolId = String.valueOf(maxHostId);
                        log.info("Transformed Fleet MDM agent tool ID from UUID {} to host ID {} using max id strategy", agentToolId, transformedAgentToolId);
                        return transformedAgentToolId;
                    } else {
                        log.info("Use uuid to fix it manually: {}", agentToolId);
                        return agentToolId;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to transform Fleet MDM agent tool ID: {}", agentToolId, e);
            throw new IllegalStateException("Failed to transform Fleet MDM agent tool ID", e);
        }
    }

    private void logHosts(List<Host> hosts) {
        String hostsInfo = buildHostInfo(hosts);
        log.info("Hosts: \n{}", hostsInfo);
    }

    private String buildHostInfo(List<Host> hosts) {
        return hosts.stream()
                .map(Host::toString)
                .collect(Collectors.joining("\n"));
    }
}
