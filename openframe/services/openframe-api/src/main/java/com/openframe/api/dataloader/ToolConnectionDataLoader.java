package com.openframe.api.dataloader;

import com.netflix.graphql.dgs.DgsDataLoader;
import com.openframe.api.service.ToolConnectionService;
import com.openframe.data.document.tool.ToolConnection;
import lombok.RequiredArgsConstructor;
import org.dataloader.BatchLoader;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

@DgsDataLoader(name = "toolConnectionDataLoader")
@RequiredArgsConstructor
public class ToolConnectionDataLoader implements BatchLoader<String, List<ToolConnection>> {

    private final ToolConnectionService toolConnectionService;

    @Override
    public CompletionStage<List<List<ToolConnection>>> load(List<String> machineIds) {
        return CompletableFuture.supplyAsync(() -> toolConnectionService.getToolConnectionsForMachines(machineIds));
    }
}