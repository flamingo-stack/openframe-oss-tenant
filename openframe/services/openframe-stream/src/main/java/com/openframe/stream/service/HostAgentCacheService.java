package com.openframe.stream.service;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.IntegratedToolId;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.sdk.fleetmdm.FleetMdmClient;
import com.openframe.sdk.fleetmdm.model.Host;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Optional;

/**
 * Service for host-agent cache operations using Spring Cache abstraction
 * Used in Fleet activities stream processing for enriching activities with agent information
 * Now uses Fleet MDM SDK directly instead of database access
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HostAgentCacheService {

    @Value("${fleet.mdm.base-url:http://fleetmdm-server.integrated-tools.svc.cluster.local:8070}")
    private String baseUrl;

    private FleetMdmClient fleetMdmClient;

    private final IntegratedToolService integratedToolService;

    /**
     * Get agent ID from cache or Fleet MDM API
     *
     * @param hostId the host ID
     * @return the agent ID, or null if not found
     */
    @Cacheable(value = "hostAgentCache", key = "#hostId", unless = "#result == null")
    public String getAgentId(Integer hostId) {
        log.debug("Fetching agent ID for host: {}", hostId);
        try {
            Host host = getFleetMdmClient() != null ? this.fleetMdmClient.getHostById(hostId.longValue()) : null;
            return host != null ? host.getUuid() : null;
        } catch (IOException | InterruptedException e) {
            log.error("Error fetching agent ID for host: {}", hostId, e);
            return null;
        }
    }

    private FleetMdmClient getFleetMdmClient() {
        if (fleetMdmClient == null) {
            Optional<IntegratedTool> optionalFleetInfo = integratedToolService.getToolById(IntegratedToolId.FLEET_SERVER_ID.getValue());
            log.info("FleetMdmClient is null for host: {}", optionalFleetInfo.map(IntegratedTool::getCredentials).orElse(null));
            optionalFleetInfo.ifPresent(integratedTool -> {
                this.fleetMdmClient = new FleetMdmClient(baseUrl, integratedTool.getCredentials().getApiKey().getKey());
            });
        }
        return fleetMdmClient;
    }
} 