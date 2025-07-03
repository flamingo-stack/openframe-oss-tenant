package com.openframe.data.service;

import com.openframe.data.model.redis.MachineIdCacheEntry;
import com.openframe.data.repository.redis.MachineIdCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Service for machine ID cache operations using Spring Data Redis
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MachineIdCacheService {

    private final MachineIdCacheRepository machineIdCacheRepository;
    
    // Default TTL for machine ID cache
    private static final Duration DEFAULT_TTL = Duration.ofHours(6);

    /**
     * Get machine ID from cache
     * 
     * @param agentId the agent ID
     * @return Optional containing machine ID if found in cache, empty otherwise
     */
    public Optional<String> getMachineId(String agentId) {
        try {
            Optional<MachineIdCacheEntry> entry = machineIdCacheRepository.findById(agentId);
            if (entry.isPresent()) {
                return Optional.of(entry.get().getMachineId());
            }
            log.debug("Machine ID not found in cache for agent: {}", agentId);
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to get machine ID from cache for agent: {}, error: {}", agentId, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Store machine ID in cache with default TTL
     * 
     * @param agentId the agent ID
     * @param machineId the machine ID to cache
     * @return true if successfully cached, false otherwise
     */
    public boolean putMachineId(String agentId, String machineId) {
        return putMachineId(agentId, machineId, DEFAULT_TTL);
    }

    /**
     * Store machine ID in cache with custom TTL
     * 
     * @param agentId the agent ID
     * @param machineId the machine ID to cache
     * @param ttl time to live
     * @return true if successfully cached, false otherwise
     */
    public boolean putMachineId(String agentId, String machineId, Duration ttl) {
        try {
            MachineIdCacheEntry entry = MachineIdCacheEntry.of(agentId, machineId, ttl.getSeconds());
            machineIdCacheRepository.save(entry);
            log.debug("Cached machine ID for agent: {} with TTL: {}", agentId, ttl);
            return true;
        } catch (Exception e) {
            log.warn("Failed to cache machine ID for agent: {}, error: {}", agentId, e.getMessage());
            return false;
        }
    }
} 