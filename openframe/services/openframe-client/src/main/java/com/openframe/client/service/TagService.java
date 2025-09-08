package com.openframe.client.service;

import com.openframe.data.document.device.MachineTag;
import com.openframe.data.document.tool.Tag;
import com.openframe.data.repository.device.MachineTagRepository;
import com.openframe.data.repository.tool.TagRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TagService {

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private MachineTagRepository machineTagRepository;

    public List<Tag> getAllTags(String organizationId) {
        return tagRepository.findByOrganizationId(organizationId);
    }

    public Tag createTag(Tag tag) {
        tag.setCreatedAt(Instant.now());
        return tagRepository.save(tag);
    }

    public Tag getTagById(String id) {
        return tagRepository.findById(id).orElse(null);
    }

    public Tag updateTag(Tag tag) {
        return tagRepository.save(tag);
    }

    public void deleteTag(String id) {
        List<MachineTag> machineTags = machineTagRepository.findByTagId(id);
        machineTagRepository.deleteAll(machineTags);
        tagRepository.deleteById(id);
    }

    public void addTagToMachine(String machineId, String tagId, String taggedBy) {
        MachineTag machineTag = new MachineTag();
        machineTag.setMachineId(machineId);
        machineTag.setTagId(tagId);
        machineTag.setTaggedAt(Instant.now());
        machineTag.setTaggedBy(taggedBy);

        machineTagRepository.save(machineTag);
    }

    public void removeTagFromMachine(String machineId, String tagId) {
        machineTagRepository.deleteByMachineIdAndTagId(machineId, tagId);
    }

    public List<Tag> getTagsForMachine(String machineId) {
        List<MachineTag> machineTags = machineTagRepository.findByMachineId(machineId);

        return machineTags.stream()
                .map(machineTag -> tagRepository.findById(machineTag.getTagId()).orElse(null))
                .filter(tag -> tag != null)
                .collect(Collectors.toList());
    }

    public List<String> getMachineIdsForTag(String tagId) {
        List<MachineTag> machineTags = machineTagRepository.findByTagId(tagId);

        return machineTags.stream()
                .map(MachineTag::getMachineId)
                .collect(Collectors.toList());
    }
}
