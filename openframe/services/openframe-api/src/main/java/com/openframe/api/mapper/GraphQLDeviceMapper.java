package com.openframe.api.mapper;

import com.openframe.api.dto.DeviceFilterOptions;
import com.openframe.api.dto.DeviceQueryResult;
import com.openframe.api.dto.PageInfo;
import com.openframe.api.dto.PaginationCriteria;
import com.openframe.api.dto.device.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class GraphQLDeviceMapper {

    public DeviceFilterOptions toDeviceFilterOptions(DeviceFilterInput input) {
        if (input == null) {
            return DeviceFilterOptions.builder().build();
        }

        return DeviceFilterOptions.builder()
                .statuses(input.getStatuses())
                .deviceTypes(input.getDeviceTypes())
                .osTypes(input.getOsTypes())
                .organizationIds(input.getOrganizationIds())
                .tagNames(input.getTagNames())
                .build();
    }

    public PaginationCriteria toPaginationCriteria(PaginationInput input) {
        if (input == null) {
            return new PaginationCriteria();
        }

        return PaginationCriteria.builder()
                .page(input.getPage())
                .pageSize(input.getPageSize())
                .build();
    }

    public DeviceConnection toDeviceConnection(DeviceQueryResult result) {
        List<DeviceEdge> edges = result.getDevices().stream()
                .map(machine -> DeviceEdge.builder()
                        .node(machine)
                        .build())
                .collect(Collectors.toList());

        PageInfo pageInfo = PageInfo.builder()
                .hasNextPage(result.getPageInfo().isHasNextPage())
                .hasPreviousPage(result.getPageInfo().isHasPreviousPage())
                .currentPage(result.getPageInfo().getCurrentPage())
                .totalPages(result.getPageInfo().getTotalPages())
                .build();

        return DeviceConnection.builder()
                .edges(edges)
                .pageInfo(pageInfo)
                .filteredCount(result.getFilteredCount())
                .build();
    }
} 