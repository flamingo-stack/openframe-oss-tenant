package com.openframe.api.dataloader;

import com.openframe.core.model.Tag;
import com.openframe.api.service.TagService;
import com.netflix.graphql.dgs.DgsDataLoader;
import org.dataloader.BatchLoader;

import java.util.List;
import java.util.concurrent.CompletionStage;

@DgsDataLoader(name = "tagDataLoader")
public class TagDataLoader implements BatchLoader<String, List<Tag>> {

    private final TagService tagService;
    
    public TagDataLoader(TagService tagService) {
        this.tagService = tagService;
    }

    @Override
    public CompletionStage<List<List<Tag>>> load(List<String> machineIds) {
        return tagService.loadTagsForMachines(machineIds);
    }
} 