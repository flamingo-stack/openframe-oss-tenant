package com.openframe.api.datafetcher;

import com.netflix.graphql.dgs.*;
import com.openframe.core.model.Machine;
import com.openframe.core.model.Tag;
import com.openframe.api.dto.DeviceFilterOptions;
import com.openframe.api.dto.DeviceQueryResult;
import com.openframe.api.dto.PaginationCriteria;
import com.openframe.api.service.DeviceFilterService;
import com.openframe.api.service.DeviceService;
import com.openframe.api.dto.device.DeviceConnection;
import com.openframe.api.dto.device.DeviceFilterInput;
import com.openframe.api.dto.DeviceFilters;
import com.openframe.api.dto.device.PaginationInput;
import com.openframe.api.mapper.GraphQLDeviceMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dataloader.DataLoader;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import java.util.*;
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
    public CompletableFuture<DeviceFilters> deviceFilters(@InputArgument DeviceFilterInput filter) {
        log.debug("Fetching device filters with filter: {}", filter);
        DeviceFilterOptions filterOptions = mapper.toDeviceFilterOptions(filter);
        
        return deviceFilterService.getDeviceFilters(filterOptions);
    }

    @DgsQuery
    public DeviceConnection devices(
            @InputArgument DeviceFilterInput filter,
            @InputArgument PaginationInput pagination,
            @InputArgument String search) {
        
        log.debug("Fetching devices with filter: {}, pagination: {}, search: {}", filter, pagination, search);

        DeviceFilterOptions filterOptions = mapper.toDeviceFilterOptions(filter);
        PaginationCriteria paginationCriteria = mapper.toPaginationCriteria(pagination);
        
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
}

