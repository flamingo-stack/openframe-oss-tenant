package com.openframe.external.mapper;

import com.openframe.api.dto.DeviceQueryResult;
import com.openframe.api.dto.FilterOption;
import com.openframe.api.dto.PageInfo;
import com.openframe.api.dto.TagFilterOption;
import com.openframe.core.model.Machine;
import com.openframe.core.model.Tag;
import com.openframe.external.dto.DeviceFilterResponse;
import com.openframe.external.dto.DeviceResponse;
import com.openframe.external.dto.DevicesResponse;
import com.openframe.external.dto.TagResponse;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class DeviceMapper {

    public DeviceResponse toDeviceResponse(Machine machine, List<Tag> tags) {
        return DeviceResponse.builder()
                .id(machine.getId())
                .machineId(machine.getMachineId())
                .hostname(machine.getHostname())
                .displayName(machine.getDisplayName())
                .ip(machine.getIp())
                .macAddress(machine.getMacAddress())
                .osUuid(machine.getOsUuid())
                .agentVersion(machine.getAgentVersion())
                .status(machine.getStatus())
                .lastSeen(machine.getLastSeen())
                .organizationId(machine.getOrganizationId())
                .serialNumber(machine.getSerialNumber())
                .manufacturer(machine.getManufacturer())
                .model(machine.getModel())
                .type(machine.getType())
                .osType(machine.getOsType())
                .osVersion(machine.getOsVersion())
                .osBuild(machine.getOsBuild())
                .timezone(machine.getTimezone())
                .registeredAt(machine.getRegisteredAt())
                .updatedAt(machine.getUpdatedAt())
                .tags(toTagResponses(tags))
                .build();
    }

    public DevicesResponse toDevicesResponse(DeviceQueryResult queryResult) {
        List<DeviceResponse> deviceResponses = queryResult.getDevices().stream()
                .map(machine -> toDeviceResponse(machine, List.of())) // Tags will be loaded separately if needed
                .collect(Collectors.toList());

        PageInfo pageInfo = PageInfo.builder()
                .hasNextPage(queryResult.getPageInfo().isHasNextPage())
                .hasPreviousPage(queryResult.getPageInfo().isHasPreviousPage())
                .currentPage(queryResult.getPageInfo().getCurrentPage())
                .totalPages(queryResult.getPageInfo().getTotalPages())
                .build();

        return DevicesResponse.builder()
                .devices(deviceResponses)
                .pageInfo(pageInfo)
                .filteredCount(queryResult.getFilteredCount())
                .build();
    }

    public DevicesResponse toDevicesResponseWithTags(DeviceQueryResult queryResult, List<List<Tag>> tagsPerMachine) {
        List<Machine> devices = queryResult.getDevices();
        List<DeviceResponse> deviceResponses = new ArrayList<>();

        for (int i = 0; i < devices.size(); i++) {
            Machine machine = devices.get(i);
            List<Tag> tags = (i < tagsPerMachine.size()) ? tagsPerMachine.get(i) : List.of();
            deviceResponses.add(toDeviceResponse(machine, tags));
        }

        PageInfo pageInfo = PageInfo.builder()
                .hasNextPage(queryResult.getPageInfo().isHasNextPage())
                .hasPreviousPage(queryResult.getPageInfo().isHasPreviousPage())
                .currentPage(queryResult.getPageInfo().getCurrentPage())
                .totalPages(queryResult.getPageInfo().getTotalPages())
                .build();

        return DevicesResponse.builder()
                .devices(deviceResponses)
                .pageInfo(pageInfo)
                .filteredCount(queryResult.getFilteredCount())
                .build();
    }

    public DeviceFilterResponse toDeviceFilterResponse(com.openframe.api.dto.DeviceFilters filters) {
        return DeviceFilterResponse.builder()
                .statuses(toFilterOptions(filters.getStatuses()))
                .deviceTypes(toFilterOptions(filters.getDeviceTypes()))
                .osTypes(toFilterOptions(filters.getOsTypes()))
                .organizationIds(toFilterOptions(filters.getOrganizationIds()))
                .tags(toTagFilterOptions(filters.getTags()))
                .filteredCount(filters.getFilteredCount())
                .build();
    }

    private List<TagResponse> toTagResponses(List<Tag> tags) {
        return tags.stream()
                .map(this::toTagResponse)
                .collect(Collectors.toList());
    }

    private TagResponse toTagResponse(Tag tag) {
        return TagResponse.builder()
                .id(tag.getId())
                .name(tag.getName())
                .description(tag.getDescription())
                .color(tag.getColor())
                .organizationId(tag.getOrganizationId())
                .createdAt(tag.getCreatedAt())
                .createdBy(tag.getCreatedBy())
                .build();
    }

    private List<DeviceFilterResponse.FilterOption> toFilterOptions(List<FilterOption> options) {
        if (options == null) {
            return List.of();
        }
        return options.stream()
                .map(option -> DeviceFilterResponse.FilterOption.builder()
                        .value(option.getValue())
                        .count(option.getCount())
                        .build())
                .collect(Collectors.toList());
    }

    private List<DeviceFilterResponse.TagFilterOption> toTagFilterOptions(List<TagFilterOption> options) {
        if (options == null) {
            return List.of();
        }
        return options.stream()
                .map(option -> DeviceFilterResponse.TagFilterOption.builder()
                        .value(option.getValue())
                        .label(option.getLabel())
                        .count(option.getCount())
                        .build())
                .collect(Collectors.toList());
    }
} 