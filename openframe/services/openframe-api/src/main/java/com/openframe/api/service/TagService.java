package com.openframe.api.service;

import com.openframe.core.model.Tag;
import com.openframe.core.model.MachineTag;
import com.openframe.data.repository.mongo.TagRepository;
import com.openframe.data.repository.mongo.MachineTagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.concurrent.CompletableFuture;
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

    public CompletableFuture<List<List<Tag>>> loadTagsForMachines(List<String> machineIds) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                log.debug("Loading tags for {} machines", machineIds.size());

                List<MachineTag> machineTags = machineTagRepository.findByMachineIdIn(machineIds);
                Set<String> tagIds = machineTags.stream()
                    .map(MachineTag::getTagId)
                    .collect(Collectors.toSet());
                List<Tag> allTags = tagIds.isEmpty() ? 
                    Collections.emptyList() : 
                    tagRepository.findAllById(tagIds);

                Map<String, Tag> tagMap = allTags.stream()
                    .collect(Collectors.toMap(Tag::getId, tag -> tag));
                Map<String, List<Tag>> machineIdToTags = new HashMap<>();
                for (MachineTag machineTag : machineTags) {
                    Tag tag = tagMap.get(machineTag.getTagId());
                    if (tag != null) {
                        machineIdToTags.computeIfAbsent(machineTag.getMachineId(), k -> new ArrayList<>())
                            .add(tag);
                    }
                }
                List<List<Tag>> result = new ArrayList<>();
                for (String machineId : machineIds) {
                    result.add(machineIdToTags.getOrDefault(machineId, Collections.emptyList()));
                }
                log.debug("Loaded tags for {} machines, found {} unique tags", 
                    machineIds.size(), allTags.size());
                return result;
            } catch (Exception e) {
                log.error("Error loading tags for machines: {}", machineIds, e);
                throw new RuntimeException("Failed to load tags for machines", e);
            }
        });
    }
} 