package com.openframe.stream.service;

import com.openframe.core.model.ToolConnection;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.debezium.ExtraParams;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.repository.mongo.ToolConnectionRepository;
import com.openframe.stream.enumeration.DataEnrichmentServiceType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@Slf4j
public class IntegratedToolDataEnrichmentService implements DataEnrichmentService<DebeziumMessage> {

    private final ToolConnectionRepository toolConnectionRepository;
    private final RedisTemplate<String, String> redisTemplate;
    
    private static final String CACHE_KEY_PREFIX = "machine_id:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    public IntegratedToolDataEnrichmentService(ToolConnectionRepository toolConnectionRepository,
                                             RedisTemplate<String, String> redisTemplate) {
        this.toolConnectionRepository = toolConnectionRepository;
        this.redisTemplate = redisTemplate;
    }

    @Override
    public ExtraParams getExtraParams(DebeziumMessage message) {
        IntegratedToolEnrichedData integratedToolEnrichedData = new IntegratedToolEnrichedData();
        if (message == null || message.getAgentId() == null) {
            return integratedToolEnrichedData;
        }
        
        String agentId = message.getAgentId();
        String machineId = getMachineIdFromCache(agentId);
        
        if (machineId != null) {
            log.debug("Machine ID found in cache for agent: {}", agentId);
            integratedToolEnrichedData.setMachineId(machineId);
        } else {
            log.debug("Machine ID not found in cache, querying database for agent: {}", agentId);
            Optional<ToolConnection> toolConnectionOptional = toolConnectionRepository.findByAgentToolId(agentId);
            toolConnectionOptional.ifPresent(toolConnection -> {
                String dbMachineId = toolConnection.getMachineId();
                integratedToolEnrichedData.setMachineId(dbMachineId);
                if (dbMachineId != null) {
                    putMachineIdToCache(agentId, dbMachineId);
                }
            });
        }
        
        return integratedToolEnrichedData;
    }

    @Override
    public DataEnrichmentServiceType getType() {
        return DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS;
    }
    
    /**
     * Get machine ID from Redis cache
     * 
     * @param agentId the agent ID to look up
     * @return machine ID if found in cache, null otherwise
     */
    private String getMachineIdFromCache(String agentId) {
        try {
            String cacheKey = CACHE_KEY_PREFIX + agentId;
            return redisTemplate.opsForValue().get(cacheKey);
        } catch (Exception e) {
            log.warn("Failed to get machine ID from cache for agent: {}, error: {}", agentId, e.getMessage());
            return null;
        }
    }
    
    /**
     * Store machine ID in Redis cache with TTL
     * 
     * @param agentId the agent ID
     * @param machineId the machine ID to cache
     */
    private void putMachineIdToCache(String agentId, String machineId) {
        try {
            String cacheKey = CACHE_KEY_PREFIX + agentId;
            redisTemplate.opsForValue().set(cacheKey, machineId, CACHE_TTL);
            log.debug("Cached machine ID for agent: {} with TTL: {}", agentId, CACHE_TTL);
        } catch (Exception e) {
            log.warn("Failed to cache machine ID for agent: {}, error: {}", agentId, e.getMessage());
        }
    }
}
