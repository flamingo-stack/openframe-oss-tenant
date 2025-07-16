package com.openframe.data.service;

import com.openframe.data.repository.mongo.ToolConnectionRepository;
import com.openframe.core.model.ToolConnection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Service for machine ID cache operations using Spring Cache abstraction
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MachineIdCacheService {

    private final ToolConnectionRepository toolConnectionRepository;

    /**
     * Get machine ID from cache or database
     * 
     * @param agentId the agent ID
     * @return the machine ID, or null if not found
     */
    @Cacheable(value = "machineIdCache", key = "#agentId", unless = "#result == null")
    public String getMachineId(String agentId) {
        log.debug("Fetching machine ID for agent: {}", agentId);
        try {
            return toolConnectionRepository.findByAgentToolId(agentId)
                .map(ToolConnection::getMachineId)
                .orElse(null);
        } catch (Exception e) {
            log.error("Error fetching machine ID for agent: {}", agentId, e);
            return null;
        }
    }
} 