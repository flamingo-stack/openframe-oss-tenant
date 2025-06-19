package com.openframe.data.service;

import com.openframe.core.model.Machine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@Slf4j
@ConditionalOnProperty(name = "spring.redis.enabled", havingValue = "true", matchIfMissing = false)
public class MachineRedisService {

    private final RedisTemplate<String, Machine> machineRedisTemplate;
    private final MongoTemplate mongoTemplate;
    private static final String MACHINE_KEY_PREFIX = "machine:";
    private static final Duration DEFAULT_TTL = Duration.ofDays(30); // 30 days by default

    public MachineRedisService(RedisTemplate<String, Machine> machineRedisTemplate, MongoTemplate mongoTemplate) {
        this.machineRedisTemplate = machineRedisTemplate;
        this.mongoTemplate = mongoTemplate;
        log.info("MachineRedisService initialized with Redis support");
    }

    /**
     * Saves machine to Redis
     * @param machine machine to save
     * @return true if save was successful
     */
    public boolean saveMachine(Machine machine) {
        try {
            String key = MACHINE_KEY_PREFIX + machine.getId();
            machineRedisTemplate.opsForValue().set(key, machine, DEFAULT_TTL);
            log.debug("Machine saved to Redis with key: {}", key);
            return true;
        } catch (Exception e) {
            log.error("Failed to save machine to Redis: {}", machine.getId(), e);
            return false;
        }
    }

    /**
     * Gets machine from Redis by ID
     * @param id machine ID
     * @return Optional with machine if found
     */
    public Optional<Machine> getMachine(String id) {
        try {
            String key = MACHINE_KEY_PREFIX + id;
            Machine machine = machineRedisTemplate.opsForValue().get(key);
            if (machine != null) {
                log.debug("Machine retrieved from Redis with key: {}", key);
            }
            return Optional.ofNullable(machine);
        } catch (Exception e) {
            log.error("Failed to get machine from Redis: {}", id, e);
            return Optional.empty();
        }
    }

    /**
     * Gets machine from Redis by ID with automatic refresh from MongoDB if not found
     * @param id machine ID
     * @return Optional with machine if found
     */
    public Optional<Machine> getMachineWithRefresh(String id) {
        Optional<Machine> machine = getMachine(id);
        if (machine.isEmpty()) {
            log.debug("Machine {} not found in Redis, attempting to refresh from MongoDB", id);
            if (refreshMachineFromMongoDB(id)) {
                return getMachine(id);
            }
        }
        return machine;
    }

    /**
     * Gets machine from Redis by machineId
     * @param machineId machine machineId
     * @return Optional with machine if found
     */
    public Optional<Machine> getMachineByMachineId(String machineId) {
        try {
            // For searching by machineId we need to use pattern search
            // This is less efficient but necessary for this case
            String pattern = MACHINE_KEY_PREFIX + "*";
            Set<String> keys = machineRedisTemplate.keys(pattern);
            
            for (String key : keys) {
                Machine machine = machineRedisTemplate.opsForValue().get(key);
                if (machine != null && machineId.equals(machine.getMachineId())) {
                    log.debug("Machine found by machineId: {} with key: {}", machineId, key);
                    return Optional.of(machine);
                }
            }
            
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to get machine by machineId from Redis: {}", machineId, e);
            return Optional.empty();
        }
    }

    /**
     * Gets machine from Redis by machineId with automatic refresh from MongoDB if not found
     * @param machineId machine machineId
     * @return Optional with machine if found
     */
    public Optional<Machine> getMachineByMachineIdWithRefresh(String machineId) {
        Optional<Machine> machine = getMachineByMachineId(machineId);
        if (machine.isEmpty()) {
            log.debug("Machine with machineId {} not found in Redis, attempting to refresh from MongoDB", machineId);
            refreshFromMongoDB();
            return getMachineByMachineId(machineId);
        }
        return machine;
    }

    /**
     * Gets all machines from Redis
     * @return list of all machines in Redis
     */
    public List<Machine> getAllMachines() {
        try {
            String pattern = MACHINE_KEY_PREFIX + "*";
            Set<String> keys = machineRedisTemplate.keys(pattern);
            
            if (keys == null || keys.isEmpty()) {
                return List.of();
            }
            
            return keys.stream()
                .map(key -> machineRedisTemplate.opsForValue().get(key))
                .filter(machine -> machine != null)
                .toList();
        } catch (Exception e) {
            log.error("Failed to get all machines from Redis", e);
            return List.of();
        }
    }

    /**
     * Gets all machines with automatic refresh from MongoDB if Redis is empty
     * @return list of all machines
     */
    public List<Machine> getAllMachinesWithRefresh() {
        List<Machine> machines = getAllMachines();
        if (machines.isEmpty()) {
            log.debug("No machines found in Redis, attempting to refresh from MongoDB");
            refreshFromMongoDB();
            return getAllMachines();
        }
        return machines;
    }

    /**
     * Deletes machine from Redis
     * @param id machine ID to delete
     * @return true if deletion was successful
     */
    public boolean deleteMachine(String id) {
        try {
            String key = MACHINE_KEY_PREFIX + id;
            Boolean result = machineRedisTemplate.delete(key);
            log.debug("Machine deleted from Redis with key: {}", key);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to delete machine from Redis: {}", id, e);
            return false;
        }
    }

    /**
     * Checks if machine exists in Redis
     * @param id machine ID
     * @return true if machine exists
     */
    public boolean exists(String id) {
        try {
            String key = MACHINE_KEY_PREFIX + id;
            return machineRedisTemplate.hasKey(key);
        } catch (Exception e) {
            log.error("Failed to check machine existence in Redis: {}", id, e);
            return false;
        }
    }

    /**
     * Updates TTL for machine
     * @param id machine ID
     * @param ttl new time to live
     * @return true if update was successful
     */
    public boolean updateTtl(String id, Duration ttl) {
        try {
            String key = MACHINE_KEY_PREFIX + id;
            Boolean result = machineRedisTemplate.expire(key, ttl);
            log.debug("TTL updated for machine with key: {} to {}", key, ttl);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to update TTL for machine in Redis: {}", id, e);
            return false;
        }
    }

    /**
     * Refreshes all machine data from MongoDB to Redis
     * Clears all existing machine data in Redis and reloads from MongoDB
     * @return number of machines refreshed
     */
    public long refreshFromMongoDB() {
        try {
            log.info("Starting machine data refresh from MongoDB to Redis");
            
            // Clear all existing machine data in Redis
            String pattern = MACHINE_KEY_PREFIX + "*";
            Set<String> keys = machineRedisTemplate.keys(pattern);
            if (!keys.isEmpty()) {
                Long deletedCount = machineRedisTemplate.delete(keys);
                log.info("Cleared {} existing machine entries from Redis", deletedCount);
            }
            
            // Load all machines from MongoDB
            List<Machine> machines = mongoTemplate.findAll(Machine.class, "machines");
            log.info("Found {} machines in MongoDB", machines.size());
            
            // Save all machines to Redis
            long savedCount = 0;
            for (Machine machine : machines) {
                if (saveMachine(machine)) {
                    savedCount++;
                }
            }
            
            log.info("Successfully refreshed {} machines from MongoDB to Redis", savedCount);
            return savedCount;
            
        } catch (Exception e) {
            log.error("Failed to refresh machine data from MongoDB to Redis", e);
            return 0;
        }
    }

    /**
     * Refreshes specific machine data from MongoDB to Redis
     * @param machineId machine ID to refresh
     * @return true if refresh was successful
     */
    public boolean refreshMachineFromMongoDB(String machineId) {
        try {
            log.debug("Refreshing machine {} from MongoDB to Redis", machineId);
            
            // Get machine from MongoDB
            Machine machine = mongoTemplate.findById(machineId, Machine.class, "machines");
            if (machine == null) {
                log.warn("Machine {} not found in MongoDB", machineId);
                return false;
            }
            
            // Delete existing machine from Redis
            deleteMachine(machineId);
            
            // Save updated machine to Redis
            boolean success = saveMachine(machine);
            if (success) {
                log.debug("Successfully refreshed machine {} from MongoDB to Redis", machineId);
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("Failed to refresh machine {} from MongoDB to Redis", machineId, e);
            return false;
        }
    }
} 