package com.openframe.external.mapper;

import com.openframe.api.dto.device.*;
import com.openframe.data.document.device.Machine;
import com.openframe.data.document.tool.Tag;
import com.openframe.external.dto.device.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class DeviceMapper extends BaseRestMapper {

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
                .map(machine -> toDeviceResponse(machine, List.of()))
                .collect(Collectors.toList());
        
        return DevicesResponse.builder()
                .devices(deviceResponses)
                .pageInfo(toRestPageInfo(queryResult.getPageInfo()))
                .filteredCount(queryResult.getFilteredCount())
                .build();
    }

    public DevicesResponse toDevicesResponseWithTags(DeviceQueryResult queryResult, List<List<Tag>> tagsPerMachine) {
        List<Machine> devices = queryResult.getDevices();
        
        List<DeviceResponse> deviceResponses = java.util.stream.IntStream.range(0, devices.size())
                .mapToObj(i -> {
                    Machine machine = devices.get(i);
                    List<Tag> tags = i < tagsPerMachine.size() ? tagsPerMachine.get(i) : List.of();
                    return toDeviceResponse(machine, tags);
                })
                .collect(Collectors.toList());
        
        return DevicesResponse.builder()
                .devices(deviceResponses)  
                .pageInfo(toRestPageInfo(queryResult.getPageInfo()))
                .filteredCount(queryResult.getFilteredCount())
                .build();
    }

    public DeviceFilterResponse toDeviceFilterResponse(DeviceFilters filters) {
        return DeviceFilterResponse.builder()
                .statuses(toDeviceFilterOptions(filters.getStatuses()))
                .deviceTypes(toDeviceFilterOptions(filters.getDeviceTypes()))
                .osTypes(toDeviceFilterOptions(filters.getOsTypes()))
                .organizationIds(toDeviceFilterOptions(filters.getOrganizationIds()))
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


    public DeviceFilterOptions toDeviceFilterOptions(DeviceFilterCriteria criteria) {
        if (criteria == null) {
            return DeviceFilterOptions.builder().build();
        }
        
        return DeviceFilterOptions.builder()
                .statuses(criteria.getStatuses())
                .deviceTypes(criteria.getDeviceTypes())
                .osTypes(criteria.getOsTypes())
                .organizationIds(criteria.getOrganizationIds())
                .tagNames(criteria.getTagNames())
                .build();
    }


    private List<DeviceFilterItem> toDeviceFilterOptions(List<DeviceFilterOption> options) {
        if (options == null) {
            return List.of();
        }
        return options.stream()
                .map(option -> DeviceFilterItem.builder()
                        .value(option.getValue())
                        .label(option.getLabel())
                        .count(option.getCount())
                        .build())
                .collect(Collectors.toList());
    }

    private List<TagFilterItem> toTagFilterOptions(List<TagFilterOption> options) {
        if (options == null) {
            return List.of();
        }
        return options.stream()
                .map(option -> TagFilterItem.builder()
                        .value(option.getValue())
                        .label(option.getLabel())
                        .count(option.getCount())
                        .build())
                .collect(Collectors.toList());
    }
} 