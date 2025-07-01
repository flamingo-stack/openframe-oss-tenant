package com.openframe.api.datafetcher;

import com.netflix.graphql.dgs.*;
import com.openframe.core.model.*;
import com.openframe.api.dto.device.*;
import com.openframe.api.service.DeviceFilterService;
import com.openframe.api.service.DeviceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.util.StringUtils;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@DgsComponent
@Slf4j
public class DeviceDataFetcher {

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

        PaginationInput normalizedPagination = deviceService.normalizePagination(pagination);
        Query query = deviceService.buildDeviceQuery(filter, search);
        long totalCount = deviceService.countMachines(query);
        PageRequest pageRequest = deviceService.createPageRequestFromInput(normalizedPagination);
        List<Machine> machines = deviceService.findMachinesWithPagination(query, pageRequest);

        return buildDeviceConnection(machines, normalizedPagination, totalCount);
    }

    @DgsQuery
    public Machine device(@InputArgument String machineId) {
        log.debug("Fetching device with ID: {}", machineId);
        
        validateMachineId(machineId);

        Optional<Machine> machineOpt = deviceService.findByMachineId(machineId);
        if (machineOpt.isPresent()) {
            Machine machine = machineOpt.get();
            deviceService.populateTags(machine);
            return machine;
        }

        return null;
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

    private void validateMachineId(String machineId) {
        if (!StringUtils.hasText(machineId)) {
            throw new IllegalArgumentException("Machine ID is required");
        }
    }
}

