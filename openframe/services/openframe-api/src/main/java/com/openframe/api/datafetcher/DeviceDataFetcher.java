package com.openframe.api.datafetcher;

import com.netflix.graphql.dgs.*;
import com.openframe.core.model.Machine;
import com.openframe.core.model.Tag;
import com.openframe.api.dto.device.DeviceConnection;
import com.openframe.api.dto.device.DeviceEdge;
import com.openframe.api.dto.device.DeviceFilterInput;
import com.openframe.api.dto.device.DeviceFilters;
import com.openframe.api.dto.device.PageInfo;
import com.openframe.api.dto.device.PaginationInput;
import com.openframe.api.service.DeviceFilterService;
import com.openframe.api.service.DeviceService;
import com.openframe.api.util.PaginationUtils;
import lombok.extern.slf4j.Slf4j;
import org.dataloader.DataLoader;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@DgsComponent
@Slf4j
@Validated
public class DeviceDataFetcher {

    private static final String SORT_FIELD = "machineId";
    private final DeviceService deviceService;
    private final DeviceFilterService deviceFilterService;

    public DeviceDataFetcher(
            DeviceService deviceService,
            DeviceFilterService deviceFilterService) {
        this.deviceService = deviceService;
        this.deviceFilterService = deviceFilterService;
    }

    @DgsQuery
    public CompletableFuture<DeviceFilters> deviceFilters(@InputArgument DeviceFilterInput filter) {
        log.debug("Fetching device filters with filter: {}", filter);
        return deviceFilterService.getDeviceFilters(filter);
    }

    @DgsQuery
    public DeviceConnection devices(
            @InputArgument DeviceFilterInput filter,
            @InputArgument PaginationInput pagination,
            @InputArgument String search) {
        
        log.debug("Fetching devices with filter: {}, pagination: {}, search: {}", filter, pagination, search);

        PaginationInput normalizedPagination = PaginationUtils.normalizePagination(pagination);
        Query query = deviceService.buildDeviceQuery(filter, search);
        long totalCount = deviceService.countMachines(query);
        PageRequest pageRequest = PaginationUtils.createPageRequestFromInput(normalizedPagination, SORT_FIELD);
        List<Machine> machines = deviceService.findMachinesWithPagination(query, pageRequest);

        return buildDeviceConnection(machines, normalizedPagination, totalCount);
    }

    @DgsQuery
    public Machine device(@InputArgument @NotBlank String machineId) {
        log.debug("Fetching device with ID: {}", machineId);
        Optional<Machine> machineOpt = deviceService.findByMachineId(machineId);
        return machineOpt.orElse(null);
    }

    @DgsData(parentType = "Machine")
    public CompletableFuture<List<Tag>> tags(DgsDataFetchingEnvironment dfe) {
        DataLoader<String, List<Tag>> dataLoader = dfe.getDataLoader("tagDataLoader");
        Machine machine = dfe.getSource();
        return dataLoader.load(machine.getId());
    }

    private DeviceConnection buildDeviceConnection(List<Machine> machines, PaginationInput pagination, long totalCount) {
        List<DeviceEdge> edges = machines.stream()
                .map(machine -> DeviceEdge.builder().node(machine).build())
                .collect(Collectors.toList());

        int totalPages = (int) Math.ceil((double) totalCount / pagination.getPageSize());
        
        PageInfo pageInfo = PageInfo.builder()
                .hasNextPage(pagination.getPage() < totalPages)
                .hasPreviousPage(pagination.getPage() > 1)
                .currentPage(pagination.getPage())
                .totalPages(totalPages)
                .build();

        return DeviceConnection.builder()
                .edges(edges)
                .pageInfo(pageInfo)
                .filteredCount(edges.size())
                .build();
    }
}

