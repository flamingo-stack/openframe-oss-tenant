package com.openframe.client.service.impl;

import com.openframe.client.service.MachineTagEventService;
import com.openframe.data.document.device.Machine;
import com.openframe.data.document.device.MachineTag;
import com.openframe.data.document.tool.Tag;
import com.openframe.data.repository.device.MachineRepository;
import com.openframe.data.repository.device.MachineTagRepository;
import com.openframe.data.repository.tool.TagRepository;
import com.openframe.kafka.model.MachinePinotMessage;
import com.openframe.kafka.producer.retry.OssTenantRetryingKafkaProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Implementation of RepositoryEventService that handles repository events and sends Kafka messages.
 * Contains all business logic for processing entity changes.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MachineTagEventServiceImpl implements MachineTagEventService {

    private final MachineRepository machineRepository;
    private final MachineTagRepository machineTagRepository;
    private final TagRepository tagRepository;
    private final OssTenantRetryingKafkaProducer ossTenantKafkaProducer;

    @Value("${openframe.oss-tenant.kafka.topics.outbound.devices-topic}")
    private String machineEventsTopic;

    @Override
    public void processMachineSave(Machine machine) {
        try {
            log.info("Processing machine save event: {}", machine);
            sendMachineEventToKafka(machine);
            log.info("Machine event processed successfully");
        } catch (Exception e) {
            log.error("Error processing machine save event: {}", e.getMessage(), e);
        }
    }

    @Override
    public void processMachineSaveAll(Iterable<Machine> machines) {
        try {
            log.info("Processing machine saveAll event: {} machines", machines);
            for (Machine machine : machines) {
                sendMachineEventToKafka(machine);
            }
        } catch (Exception e) {
            log.error("Error in processMachineSaveAll: {}", e.getMessage(), e);
        }
    }

    @Override
    public void processMachineTagSave(MachineTag machineTag) {
        try {
            log.info("Processing machineTag save event: {}", machineTag);
            sendMachineTagEventToKafka(machineTag);
            log.info("MachineTag event processed successfully for machine: {}", machineTag.getMachineId());
        } catch (Exception e) {
            log.error("Error processing machine tag save event: {}", e.getMessage(), e);
        }
    }

    @Override
    public void processMachineTagSaveAll(Iterable<MachineTag> machineTags) {
        try {
            log.info("Processing machineTag saveAll event: {} machineTags", machineTags);

            // Group by machineId to avoid duplicate processing
            Set<String> processedMachineIds = new HashSet<>();

            // Process each machineTag
            for (MachineTag machineTag : machineTags) {
                if (!processedMachineIds.contains(machineTag.getMachineId())) {
                    sendMachineTagEventToKafka(machineTag);
                    processedMachineIds.add(machineTag.getMachineId());
                }
            }
        } catch (Exception e) {
            log.error("Error in processMachineTagSaveAll: {}", e.getMessage(), e);
        }
    }

    @Override
    public void processTagSave(Tag tag) {
        try {
            log.info("Processing tag save event: {}", tag);
            sendTagEventToKafka(tag);
            log.info("Tag event processed successfully");
        } catch (Exception e) {
            log.error("Error processing tag save event: {}", e.getMessage(), e);
        }
    }

    @Override
    public void processTagSaveAll(Iterable<Tag> tags) {
        try {
            log.info("Processing tag saveAll event: {} tags", tags);

            // Process each tag
            for (Tag tag : tags) {
                sendTagEventToKafka(tag);
            }
        } catch (Exception e) {
            log.error("Error in processTagSaveAll: {}", e.getMessage(), e);
        }
    }

    private void sendMachineEventToKafka(Machine machineEntity) {
        try {
            // Fetch all tags for the machine
            List<Tag> machineTags = fetchMachineTags(machineEntity.getMachineId());

            // Build MachinePinotMessage with complete data
            MachinePinotMessage message = buildMachinePinotMessage(machineEntity, machineTags);

            ossTenantKafkaProducer.publish(machineEventsTopic,  machineEntity.getMachineId(), message);
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
        ossTenantKafkaProducer.publish(machineEventsTopic, machine.getMachineId(), message);
    }

    private void sendTagEventToKafka(Tag tagEntity) {
        // Check if this is an update operation and if name changed
        if (tagEntity.getId() != null) {

            // Fetch all machines with this tag
            List<String> machineIds = fetchMachineIdsForTag(tagEntity.getId());

            // Send MachinePinotMessage for each affected machine
            for (String machineId : machineIds) {
                try {
                    Machine machine = fetchMachine(machineId);
                    if (machine != null) {
                        List<Tag> machineTags = fetchMachineTags(machineId);
                        MachinePinotMessage message = buildMachinePinotMessage(machine, machineTags);

                        ossTenantKafkaProducer.publish(machineEventsTopic, machineId, message);
                        log.debug("Sent update for machine {} due to tag name change", machineId);
                    }
                } catch (Exception e) {
                    log.error("Error processing machine {} for tag name change: {}", machineId, e.getMessage());
                }
            }

            log.info("Processed tag name change for {} machines", machineIds.size());
        }
    }

    /**
     * Fetches all tags for a given machine ID.
     */
    private List<Tag> fetchMachineTags(String machineId) {
        List<MachineTag> machineTags = machineTagRepository.findByMachineId(machineId);
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