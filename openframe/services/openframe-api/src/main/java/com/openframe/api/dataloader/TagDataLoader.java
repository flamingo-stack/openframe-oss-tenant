package com.openframe.api.dataloader;

import com.netflix.graphql.dgs.DgsDataLoader;
import com.openframe.api.service.TagService;
import com.openframe.data.document.tool.Tag;
import lombok.RequiredArgsConstructor;
import org.dataloader.BatchLoader;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

@DgsDataLoader(name = "tagDataLoader")
@RequiredArgsConstructor
public class TagDataLoader implements BatchLoader<String, List<Tag>> {

    private final TagService tagService;

    @Override
    public CompletionStage<List<List<Tag>>> load(List<String> machineIds) {
        return CompletableFuture.supplyAsync(() -> tagService.getTagsForMachines(machineIds));
    }
} 