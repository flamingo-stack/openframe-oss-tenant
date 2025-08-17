package com.openframe.api.mapper;

import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.api.dto.device.DeviceQueryResult;
import com.openframe.api.dto.device.*;
import com.openframe.api.dto.shared.CursorPaginationInput;
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

    public CursorPaginationCriteria toCursorPaginationCriteria(CursorPaginationInput input) {
        if (input == null) {
            return new CursorPaginationCriteria();
        }

        return CursorPaginationCriteria.builder()
                .limit(input.getLimit())
                .cursor(input.getCursor())
                .build();
    }

    public DeviceConnection toDeviceConnection(DeviceQueryResult result) {
        List<DeviceEdge> edges = result.getDevices().stream()
                .map(machine -> DeviceEdge.builder()
                        .node(machine)
                        .cursor(machine.getMachineId())
                        .build())
                .collect(Collectors.toList());
        return DeviceConnection.builder()
                .edges(edges)
                .pageInfo(result.getPageInfo())
                .filteredCount(result.getFilteredCount())
                .build();
    }
} 