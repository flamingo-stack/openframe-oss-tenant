package com.openframe.api.service;

import com.openframe.data.document.device.MachineTag;
import com.openframe.data.document.tool.Tag;
import com.openframe.data.repository.device.MachineTagRepository;
import com.openframe.data.repository.tool.TagRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional(readOnly = true)
public class TagService {

    private final TagRepository tagRepository;
    private final MachineTagRepository machineTagRepository;

    public TagService(TagRepository tagRepository, MachineTagRepository machineTagRepository) {
        this.tagRepository = tagRepository;
        this.machineTagRepository = machineTagRepository;
    }

    /**
     * Method to get tags for multiple machines (core logic)
     */
    public List<List<Tag>> getTagsForMachines(List<String> machineIds) {
        log.debug("Getting tags for {} machines", machineIds.size());

        if (machineIds.isEmpty()) {
            return new ArrayList<>();
        }

        Map<String, List<Tag>> tagsByMachineId = new HashMap<>();

        // Bulk load all machine tags
        List<MachineTag> machineTags = machineTagRepository.findByMachineIdIn(machineIds);
        Map<String, List<String>> tagIdsByMachineId = machineTags.stream()
                .collect(Collectors.groupingBy(
                        MachineTag::getMachineId,
                        Collectors.mapping(MachineTag::getTagId, Collectors.toList())
                ));

        // Get all unique tag IDs
        Set<String> allTagIds = machineTags.stream()
                .map(MachineTag::getTagId)
                .collect(Collectors.toSet());

        if (allTagIds.isEmpty()) {
            // Return empty lists for all machines
            return machineIds.stream()
                    .map(id -> new ArrayList<Tag>())
                    .collect(Collectors.toList());
        }

        // Bulk load all tags
        List<Tag> allTags = tagRepository.findAllById(new ArrayList<>(allTagIds));
        Map<String, Tag> tagsById = allTags.stream()
                .collect(Collectors.toMap(Tag::getId, tag -> tag));

        // Build result map
        for (String machineId : machineIds) {
            List<String> tagIds = tagIdsByMachineId.getOrDefault(machineId, new ArrayList<>());
            List<Tag> tagsForMachine = tagIds.stream()
                    .map(tagsById::get)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            tagsByMachineId.put(machineId, tagsForMachine);
        }

        // Return in the same order as requested
        return machineIds.stream()
                .map(machineId -> tagsByMachineId.getOrDefault(machineId, new ArrayList<>()))
                .collect(Collectors.toList());
    }


    public List<Tag> getTagsForMachine(String machineId) {
        log.debug("Getting tags for machine: {}", machineId);

        List<MachineTag> machineTags = machineTagRepository.findByMachineId(machineId);
        List<String> tagIds = machineTags.stream()
                .map(MachineTag::getTagId)
                .collect(Collectors.toList());

        if (tagIds.isEmpty()) {
            return new ArrayList<>();
        }

        return tagRepository.findAllById(tagIds);
    }
} 