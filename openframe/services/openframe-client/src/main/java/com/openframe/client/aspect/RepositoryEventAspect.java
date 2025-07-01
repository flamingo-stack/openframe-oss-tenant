package com.openframe.client.aspect;

import com.openframe.client.dto.MachinePinotMessage;
import com.openframe.core.model.Machine;
import com.openframe.core.model.MachineTag;
import com.openframe.core.model.Tag;
import com.openframe.data.repository.kafka.GenericKafkaProducer;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.MachineTagRepository;
import com.openframe.data.repository.mongo.TagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AOP aspect to intercept repository save operations and send Kafka messages.
 * Handles Machine, MachineTag, and Tag entity changes.
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class RepositoryEventAspect {

    private final MachineRepository machineRepository;
    private final MachineTagRepository machineTagRepository;
    private final TagRepository tagRepository;
    private final GenericKafkaProducer kafkaProducer;
    
    @Value("${kafka.producer.topic.machine.name}")
    private String machineEventsTopic;
    
    // Thread-safe map to store original tag states for comparison
    private final ConcurrentHashMap<String, Tag> originalTagStates = new ConcurrentHashMap<>();

    /**
     * Intercepts Machine repository save operations.
     * Fetches all tags for the machine and sends MachinePinotMessage.
     */
    @AfterReturning(
        pointcut = "execution(* com.openframe.data.repository.mongo.MachineRepository.save(..)) && args(machine)",
        returning = "result",
        argNames = "joinPoint,machine,result"
    )
    public void afterMachineSave(JoinPoint joinPoint, Object machine, Object result) {
        try {
            log.info("Machine save operation detected: {}", machine);
            
            // Cast to Machine entity
            Machine machineEntity = (Machine) machine;

            sendMachineEventToKafka(machineEntity);
            
            log.info("Machine event processed successfully");
        } catch (Exception e) {
            log.error("Error processing machine save event: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts Machine repository saveAll operations.
     * Processes each machine in the collection and sends MachinePinotMessage for each.
     */
    @AfterReturning(
        pointcut = "execution(* com.openframe.data.repository.mongo.MachineRepository.saveAll(..)) && args(machines)",
        returning = "result",
        argNames = "joinPoint,machines,result"
    )
    public void afterMachineSaveAll(JoinPoint joinPoint, Object machines, Object result) {
        try {
            log.info("Machine saveAll operation detected: {} machines", machines);
            
            // Cast to collection of Machine entities
            @SuppressWarnings("unchecked")
            Iterable<Machine> machineEntities = (Iterable<Machine>) machines;
            
            // Process each machine
            for (Machine machine : machineEntities) {
                sendMachineEventToKafka(machine);
            }
        } catch (Exception e) {
            log.error("Error in afterMachineSaveAll: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts MachineTag repository save operations.
     * Fetches associated machine and tag data, then sends MachinePinotMessage.
     */
    @AfterReturning(
        pointcut = "execution(* com.openframe.data.repository.mongo.MachineTagRepository.save(..)) && args(machineTag)",
        returning = "result",
        argNames = "joinPoint,machineTag,result"
    )
    public void afterMachineTagSave(JoinPoint joinPoint, Object machineTag, Object result) {
        try {
            log.info("MachineTag save operation detected: {}", machineTag);
            
            // Cast to MachineTag entity
            MachineTag machineTagEntity = (MachineTag) machineTag;
            
            sendMachineTagEventToKafka(machineTagEntity);
            
            log.info("MachineTag event processed successfully for machine: {}", machineTagEntity.getMachineId());
        } catch (Exception e) {
            log.error("Error processing machine tag save event: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts MachineTag repository saveAll operations.
     * Processes each machineTag in the collection and sends MachinePinotMessage for each affected machine.
     */
    @AfterReturning(
        pointcut = "execution(* com.openframe.data.repository.mongo.MachineTagRepository.saveAll(..)) && args(machineTags)",
        returning = "result",
        argNames = "joinPoint,machineTags,result"
    )
    public void afterMachineTagSaveAll(JoinPoint joinPoint, Object machineTags, Object result) {
        try {
            log.info("MachineTag saveAll operation detected: {} machineTags", machineTags);
            
            // Cast to collection of MachineTag entities
            @SuppressWarnings("unchecked")
            Iterable<MachineTag> machineTagEntities = (Iterable<MachineTag>) machineTags;
            
            // Group by machineId to avoid duplicate processing
            Set<String> processedMachineIds = new HashSet<>();
            
            // Process each machineTag
            for (MachineTag machineTag : machineTagEntities) {
                if (!processedMachineIds.contains(machineTag.getMachineId())) {
                    sendMachineTagEventToKafka(machineTag);
                    processedMachineIds.add(machineTag.getMachineId());
                }
            }
        } catch (Exception e) {
            log.error("Error in afterMachineTagSaveAll: {}", e.getMessage(), e);
        }
    }

    /**
     * Captures original tag state before save operation.
     */
    @Before("execution(* com.openframe.data.repository.mongo.TagRepository.save(..)) && args(tag)")
    public void beforeTagSave(JoinPoint joinPoint, Object tag) {
        try {
            Tag tagEntity = (Tag) tag;
            
            // Only capture state if this is an update operation (tag has an ID)
            if (tagEntity.getId() != null) {
                Tag originalTag = fetchTagById(tagEntity.getId());
                if (originalTag != null) {
                    originalTagStates.put(tagEntity.getId(), originalTag);
                    log.debug("Captured original tag state for ID: {}", tagEntity.getId());
                }
            }
        } catch (Exception e) {
            log.error("Error capturing original tag state: {}", e.getMessage(), e);
        }
    }

    /**
     * Captures original tag states before saveAll operation.
     */
    @Before("execution(* com.openframe.data.repository.mongo.TagRepository.saveAll(..)) && args(tags)")
    public void beforeTagSaveAll(JoinPoint joinPoint, Object tags) {
        try {
            @SuppressWarnings("unchecked")
            Iterable<Tag> tagEntities = (Iterable<Tag>) tags;
            
            // Store original tag states for comparison after save
            for (Tag tag : tagEntities) {
                if (tag.getId() != null) {
                    Tag originalTag = fetchTagById(tag.getId());
                    if (originalTag != null) {
                        originalTagStates.put(tag.getId(), originalTag);
                        log.debug("Captured original tag state for ID: {}", tag.getId());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error capturing original tag states: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts Tag repository save operations.
     * Only processes when tag name changes, fetches all affected machines.
     */
    @AfterReturning(
        pointcut = "execution(* com.openframe.data.repository.mongo.TagRepository.save(..)) && args(tag)",
        returning = "result",
        argNames = "joinPoint,tag,result"
    )
    public void afterTagSave(JoinPoint joinPoint, Object tag, Object result) {
        try {
            log.info("Tag save operation detected: {}", tag);
            
            // Cast to Tag entity
            Tag tagEntity = (Tag) tag;
            
            sendTagEventToKafka(tagEntity);
            
            log.info("Tag event processed successfully");
        } catch (Exception e) {
            log.error("Error processing tag save event: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts Tag repository saveAll operations.
     * Processes each tag in the collection and sends MachinePinotMessage for affected machines.
     */
    @AfterReturning(
        pointcut = "execution(* com.openframe.data.repository.mongo.TagRepository.saveAll(..)) && args(tags)",
        returning = "result",
        argNames = "joinPoint,tags,result"
    )
    public void afterTagSaveAll(JoinPoint joinPoint, Object tags, Object result) {
        try {
            log.info("Tag saveAll operation detected: {} tags", tags);
            
            // Cast to collection of Tag entities
            @SuppressWarnings("unchecked")
            Iterable<Tag> tagEntities = (Iterable<Tag>) tags;
            
            // Process each tag
            for (Tag tag : tagEntities) {
                sendTagEventToKafka(tag);
            }
        } catch (Exception e) {
            log.error("Error in afterTagSaveAll: {}", e.getMessage(), e);
        }
    }

    private void sendMachineEventToKafka(Machine machineEntity) {
        try {
            // Fetch all tags for the machine
            List<Tag> machineTags = fetchMachineTags(machineEntity.getMachineId());

            // Build MachinePinotMessage with complete data
            MachinePinotMessage message = buildMachinePinotMessage(machineEntity, machineTags);

            // Send to Kafka asynchronously
            kafkaProducer.sendMessage(machineEventsTopic, machineEntity.getMachineId(), message);
        } catch (Exception e) {
            log.error("Error sending machine event to Kafka for machine {}: {}", 
                machineEntity.getMachineId(), e.getMessage(), e);
        }
    }

    private void sendMachineTagEventToKafka(MachineTag machineTagEntity) {
        // Fetch associated machine data
        Machine machine = fetchMachine(machineTagEntity.getMachineId());
        if (machine == null) {
            log.warn("Machine not found for machineId: {}", machineTagEntity.getMachineId());
            return;
        }

        // Fetch all tags for the machine (including the new one)
        List<Tag> machineTags = fetchMachineTags(machine.getMachineId());

        // Build MachinePinotMessage with updated tag list
        MachinePinotMessage message = buildMachinePinotMessage(machine, machineTags);

        // Send to Kafka asynchronously
        kafkaProducer.sendMessage(machineEventsTopic, machine.getMachineId(), message);
    }
    private void sendTagEventToKafka(Tag tagEntity) {
        // Check if this is an update operation and if name changed
        if (tagEntity.getId() != null) {
            Tag originalTag = originalTagStates.remove(tagEntity.getId());
            if (originalTag != null && !originalTag.getName().equals(tagEntity.getName())) {
                log.info("Tag name changed from '{}' to '{}'", originalTag.getName(), tagEntity.getName());

                // Fetch all machines with this tag
                List<String> machineIds = fetchMachineIdsForTag(tagEntity.getId());

                // Send MachinePinotMessage for each affected machine
                for (String machineId : machineIds) {
                    try {
                        Machine machine = fetchMachine(machineId);
                        if (machine != null) {
                            List<Tag> machineTags = fetchMachineTags(machineId);
                            MachinePinotMessage message = buildMachinePinotMessage(machine, machineTags);

                            kafkaProducer.sendMessage(  machineEventsTopic, machineId, message);
                            log.debug("Sent update for machine {} due to tag name change", machineId);
                        }
                    } catch (Exception e) {
                        log.error("Error processing machine {} for tag name change: {}", machineId, e.getMessage());
                    }
                }

                log.info("Processed tag name change for {} machines", machineIds.size());
            } else if (originalTag != null) {
                log.debug("Tag updated but name did not change for ID: {}", tagEntity.getId());
            }
        }
    }

    /**
     * Fetches all tags for a given machine ID.
     */
    private List<Tag> fetchMachineTags(String machineId) {
        List<MachineTag> machineTags = machineTagRepository.findByMachineId(machineId);
        
        if (machineTags.isEmpty()) {
            return List.of();
        }
        
        // Extract tag IDs
        List<String> tagIds = machineTags.stream()
            .map(MachineTag::getTagId)
            .toList();
        return tagRepository.findAllById(tagIds);
    }

    /**
     * Fetches machine data by machineId.
     */
    private Machine fetchMachine(String machineId) {
        try {
            return machineRepository.findByMachineId(machineId).orElse(null);
        } catch (Exception e) {
            log.error("Error fetching machine with machineId {}: {}", machineId, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Fetches tag data by ID.
     */
    private Tag fetchTagById(String tagId) {
        try {
            return tagRepository.findById(tagId).orElse(null);
        } catch (Exception e) {
            log.error("Error fetching tag with id {}: {}", tagId, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Fetches all machine IDs that have a specific tag.
     */
    private List<String> fetchMachineIdsForTag(String tagId) {
        try {
            List<MachineTag> machineTags = machineTagRepository.findByTagId(tagId);
            
            return machineTags.stream()
                .map(MachineTag::getMachineId)
                .toList();
        } catch (Exception e) {
            log.error("Error fetching machine IDs for tag {}: {}", tagId, e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * Builds MachinePinotMessage from Machine entity and its tags.
     */
    private MachinePinotMessage buildMachinePinotMessage(Machine machine, List<Tag> tags) {
        return MachinePinotMessage.builder()
            .machineId(machine.getMachineId())
            .organizationId(machine.getOrganizationId())
            .deviceType(machine.getType() != null ? machine.getType().toString() : null)
            .status(machine.getStatus() != null ? machine.getStatus().toString() : null)
            .osType(machine.getOsType())
            .tags(tags.stream()
                .map(Tag::getName)
                .toList())
            .build();
    }
} 