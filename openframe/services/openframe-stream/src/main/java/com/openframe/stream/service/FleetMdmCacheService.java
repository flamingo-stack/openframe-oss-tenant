package com.openframe.stream.service;

import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.tool.IntegratedToolId;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.sdk.fleetmdm.FleetMdmClient;
import com.openframe.sdk.fleetmdm.model.Host;
import com.openframe.sdk.fleetmdm.model.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Optional;

/**
 * Service for Fleet MDM cache operations using Spring Cache abstraction
 * Used in Fleet activities stream processing for enriching activities with:
 * - Agent information (host-to-agent mapping)
 * - Query definitions (query metadata by ID)
 * 
 * Uses Fleet MDM SDK directly instead of database access
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FleetMdmCacheService {

    @Value("${fleet.mdm.base-url}")
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

    /**
     * Get query definition from cache or Fleet MDM API
     *
     * @param queryId the query ID
     * @return the Query object, or null if not found
     */
    @Cacheable(value = "fleetQueryCache", key = "#queryId", unless = "#result == null")
    public Query getQueryById(Long queryId) {
        log.debug("Fetching query definition for query ID: {}", queryId);
        try {
            FleetMdmClient client = getFleetMdmClient();
            return client != null ? client.getQueryById(queryId) : null;
        } catch (IOException | InterruptedException e) {
            log.error("Error fetching query definition for query ID: {}", queryId, e);
            return null;
        }
    }

    private FleetMdmClient getFleetMdmClient() {
        if (fleetMdmClient == null) {
            Optional<IntegratedTool> optionalFleetInfo = integratedToolService.getToolById(IntegratedToolId.FLEET_SERVER_ID.getValue());
            log.info("FleetMdmClient is null, attempting to initialize with tool: {}", 
                optionalFleetInfo.map(IntegratedTool::getCredentials).orElse(null));
            optionalFleetInfo.ifPresent(integratedTool -> {
                this.fleetMdmClient = new FleetMdmClient(baseUrl, integratedTool.getCredentials().getApiKey().getKey());
            });
        }
        return fleetMdmClient;
    }
}

