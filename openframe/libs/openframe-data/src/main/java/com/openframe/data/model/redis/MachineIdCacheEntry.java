package com.openframe.data.model.redis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Machine ID cache entry model for Redis storage
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@RedisHash("machine_id_cache")
public class MachineIdCacheEntry implements Serializable {

    @Id
    private String agentId;
    
    private String machineId;
    
    private LocalDateTime createdAt;
    
    @TimeToLive
    private Long timeToLive;
    
    /**
     * Create a new machine ID cache entry
     * 
     * @param agentId the agent ID
     * @param machineId the machine ID
     * @param ttlSeconds time to live in seconds
     * @return new MachineIdCacheEntry instance
     */
    public static MachineIdCacheEntry of(String agentId, String machineId, long ttlSeconds) {
        return MachineIdCacheEntry.builder()
            .agentId(agentId)
            .machineId(machineId)
            .createdAt(LocalDateTime.now())
            .timeToLive(ttlSeconds)
            .build();
    }
} 