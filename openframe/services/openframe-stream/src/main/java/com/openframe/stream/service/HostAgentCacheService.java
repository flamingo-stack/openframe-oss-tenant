package com.openframe.stream.service;

import com.openframe.sdk.fleetmdm.FleetMdmClient;
import com.openframe.sdk.fleetmdm.model.Host;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Service for host-agent cache operations using Spring Cache abstraction
 * Used in Fleet activities stream processing for enriching activities with agent information
 * Now uses Fleet MDM SDK directly instead of database access
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HostAgentCacheService {

    private final FleetMdmClient fleetMdmClient;

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
            Host host = fleetMdmClient.getHostById(hostId.longValue());
            return host != null ? host.getUuid() : null;
        } catch (IOException | InterruptedException e) {
            log.error("Error fetching agent ID for host: {}", hostId, e);
            return null;
        }
    }
} 