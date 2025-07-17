package com.openframe.stream.service;

import com.openframe.stream.model.fleet.FleetHost;
import com.openframe.stream.repository.fleet.FleetHostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Service for host-agent cache operations using Spring Cache abstraction
 * Used in Fleet activities stream processing for enriching activities with agent information
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HostAgentCacheService {

    private final FleetHostRepository fleetHostRepository;

    /**
     * Get agent ID from cache or database
     *
     * @param hostId the host ID
     * @return the agent ID, or null if not found
     */
    @Cacheable(value = "hostAgentCache", key = "#hostId", unless = "#result == null")
    public String getAgentId(Long hostId) {
        log.debug("Fetching agent ID for host: {}", hostId);
        try {
            return fleetHostRepository.findById(hostId)
                    .map(FleetHost::getUuid)
                    .orElse(null);
        } catch (Exception e) {
            log.error("Error fetching agent ID for host: {}", hostId, e);
            return null;
        }
    }
} 