package com.openframe.data.service;

import com.openframe.core.model.Machine;
import com.openframe.core.model.MachineTag;
import com.openframe.core.model.Tag;
import com.openframe.data.model.kafka.MachinePinotMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@ConditionalOnProperty(name = "spring.redis.enabled", havingValue = "true", matchIfMissing = false)
public class MachineRedisService {

    private final RedisTemplate<String, MachinePinotMessage> machineRedisTemplate;
    private final MongoTemplate mongoTemplate;
    private static final String MACHINE_KEY_PREFIX = "machine:";
    private static final Duration DEFAULT_TTL = Duration.ofDays(30); // 30 days by default

    public MachineRedisService(RedisTemplate<String, MachinePinotMessage> machineRedisTemplate, MongoTemplate mongoTemplate) {
        this.machineRedisTemplate = machineRedisTemplate;
        this.mongoTemplate = mongoTemplate;
        log.info("MachineRedisService initialized with Redis support");
    }

    /**
     * Saves machine to Redis
     * @param machine machine to save
     * @return true if save was successful
     */
    public boolean saveMachine(MachinePinotMessage machine) {
        try {
            String key = MACHINE_KEY_PREFIX + machine.getMachineId();
            machineRedisTemplate.opsForValue().set(key, machine, DEFAULT_TTL);
            log.debug("Machine saved to Redis with key: {}", key);
            return true;
        } catch (Exception e) {
            log.error("Failed to save machine to Redis: {}", machine.getMachineId(), e);
            return false;
        }
    }

    /**
     * Gets machine from Redis by ID
     * @param id machine ID
     * @return Optional with machine if found
     */
    public Optional<MachinePinotMessage> getMachine(String id) {
        try {
            String key = MACHINE_KEY_PREFIX + id;
            MachinePinotMessage machine = machineRedisTemplate.opsForValue().get(key);
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
    public Optional<MachinePinotMessage> getMachineWithRefresh(String id) {
        Optional<MachinePinotMessage> machine = getMachine(id);
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
    public Optional<MachinePinotMessage> getMachineByMachineId(String machineId) {
        try {
            // For searching by machineId we need to use pattern search
            // This is less efficient but necessary for this case
            String pattern = MACHINE_KEY_PREFIX + "*";
            Set<String> keys = machineRedisTemplate.keys(pattern);
            
            for (String key : keys) {
                MachinePinotMessage machine = machineRedisTemplate.opsForValue().get(key);
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
    public Optional<MachinePinotMessage> getMachineByMachineIdWithRefresh(String machineId) {
        Optional<MachinePinotMessage> machine = getMachineByMachineId(machineId);
        if (machine.isEmpty()) {
            log.debug("Machine with machineId {} not found in Redis, attempting to refresh from MongoDB", machineId);
            refreshMachineFromMongoDB(machineId);
            return getMachineByMachineId(machineId);
        }
        return machine;
    }

    /**
     * Gets all machines from Redis
     * @return list of all machines in Redis
     */
    public List<MachinePinotMessage> getAllMachines() {
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
     * Refreshes specific machine data from MongoDB to Redis
     * 1. Find machine from MongoDB collection
     * 2. Find all MachineTag for this machine
     * 3. Find all Tag
     * 4. Convert all to MachinePinotMessage
     * 5. Save to Redis
     * @param machineId machine ID to refresh
     * @return true if refresh was successful
     */
    public boolean refreshMachineFromMongoDB(String machineId) {
        try {
            log.debug("Refreshing machine {} from MongoDB to Redis", machineId);
            
            // 1. Find machine from MongoDB collection
            Machine machine = mongoTemplate.findById(machineId, Machine.class, "machines");
            if (machine == null) {
                log.warn("Machine {} not found in MongoDB", machineId);
                return false;
            }
            
            // 2. Find all MachineTag for this machine
            List<MachineTag> machineTags = mongoTemplate.find(
                org.springframework.data.mongodb.core.query.Query.query(
                    org.springframework.data.mongodb.core.query.Criteria.where("machineId").is(machineId)
                ), 
                MachineTag.class, 
                "machine_tags"
            );
            log.debug("Found {} machine tags for machine {}", machineTags.size(), machineId);
            
            // 3. Find all Tag
            List<String> tagIds = machineTags.stream()
                .map(MachineTag::getTagId)
                .collect(Collectors.toList());
            
            List<Tag> tags = List.of();
            if (!tagIds.isEmpty()) {
                tags = mongoTemplate.find(
                    org.springframework.data.mongodb.core.query.Query.query(
                        org.springframework.data.mongodb.core.query.Criteria.where("_id").in(tagIds)
                    ), 
                    Tag.class, 
                    "tags"
                );
                log.debug("Found {} tags for machine {}", tags.size(), machineId);
            }
            
            // 4. Convert all to MachinePinotMessage
            MachinePinotMessage machinePinotMessage = convertToMachinePinotMessage(machine, machineTags, tags);
            
            // 5. Save to Redis
            boolean success = saveMachine(machinePinotMessage);
            if (success) {
                log.debug("Successfully refreshed machine {} from MongoDB to Redis with {} tags", machineId, tags.size());
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("Failed to refresh machine {} from MongoDB to Redis", machineId, e);
            return false;
        }
    }

    /**
     * Convert Machine, MachineTags, and Tags to MachinePinotMessage
     * @param machine machine data
     * @param machineTags machine-tag relationships
     * @param tags tag data
     * @return MachinePinotMessage
     */
    private MachinePinotMessage convertToMachinePinotMessage(Machine machine, List<MachineTag> machineTags, List<Tag> tags) {
        MachinePinotMessage machinePinotMessage = new MachinePinotMessage();
        
        // Set basic machine information
        machinePinotMessage.setMachineId(machine.getMachineId());
        machinePinotMessage.setOrganizationId(machine.getOrganizationId());
        machinePinotMessage.setDeviceType(machine.getType().toString());
        machinePinotMessage.setStatus(machine.getStatus().toString());
        machinePinotMessage.setOsType(machine.getOsType());

        // Set tags information
        List<String> tagsString = tags.stream()
            .map(Tag::getName)
            .toList();
        machinePinotMessage.setTags(tagsString);
        
        return machinePinotMessage;
    }
} 