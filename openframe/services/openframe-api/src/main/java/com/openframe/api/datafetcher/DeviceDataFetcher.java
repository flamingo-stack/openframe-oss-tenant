package com.openframe.api.datafetcher;

import com.netflix.graphql.dgs.*;
import com.openframe.api.dto.device.*;
import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.api.dto.shared.CursorPaginationInput;
import com.openframe.api.mapper.GraphQLDeviceMapper;
import com.openframe.api.service.DeviceFilterService;
import com.openframe.api.service.DeviceService;
import com.openframe.data.document.device.Machine;
import com.openframe.data.document.tool.Tag;
import com.openframe.data.document.tool.ToolConnection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dataloader.DataLoader;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@DgsComponent
@Slf4j
@Validated
@RequiredArgsConstructor
public class DeviceDataFetcher {

    private final DeviceService deviceService;
    private final DeviceFilterService deviceFilterService;
    private final GraphQLDeviceMapper mapper;

    @DgsQuery
    public CompletableFuture<DeviceFilters> deviceFilters(@InputArgument @Valid DeviceFilterInput filter) {
        log.debug("Fetching device filters with filter: {}", filter);
        DeviceFilterOptions filterOptions = mapper.toDeviceFilterOptions(filter);
        
        return deviceFilterService.getDeviceFilters(filterOptions);
    }

    @DgsQuery
    public DeviceConnection devices(
            @InputArgument @Valid DeviceFilterInput filter,
            @InputArgument @Valid CursorPaginationInput pagination,
            @InputArgument String search) {
        
        log.debug("Fetching devices with filter: {}, pagination: {}, search: {}", filter, pagination, search);
        DeviceFilterOptions filterOptions = mapper.toDeviceFilterOptions(filter);
        CursorPaginationCriteria paginationCriteria = mapper.toCursorPaginationCriteria(pagination);
        DeviceQueryResult result = deviceService.queryDevices(filterOptions, paginationCriteria, search);
        return mapper.toDeviceConnection(result);
    }

    @DgsQuery
    public Machine device(@InputArgument @NotBlank String machineId) {
        log.debug("Fetching device with ID: {}", machineId);
        return deviceService.findByMachineId(machineId).orElse(null);
    }

    @DgsData(parentType = "Machine")
    public CompletableFuture<List<Tag>> tags(DgsDataFetchingEnvironment dfe) {
        DataLoader<String, List<Tag>> dataLoader = dfe.getDataLoader("tagDataLoader");
        Machine machine = dfe.getSource();
        return dataLoader.load(machine.getId());
    }

    @DgsData(parentType = "Machine")
    public CompletableFuture<List<ToolConnection>> toolConnections(DgsDataFetchingEnvironment dfe) {
        DataLoader<String, List<ToolConnection>> dataLoader = dfe.getDataLoader("toolConnectionDataLoader");
        Machine machine = dfe.getSource();
        return dataLoader.load(machine.getMachineId());
    }
}

