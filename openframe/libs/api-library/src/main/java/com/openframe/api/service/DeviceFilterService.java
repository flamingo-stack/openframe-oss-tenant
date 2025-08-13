package com.openframe.api.service;

import com.openframe.api.dto.device.DeviceFilterOptions;
import com.openframe.api.dto.device.DeviceFilters;
import com.openframe.api.dto.device.DeviceFilterOption;
import com.openframe.api.dto.device.TagFilterOption;
import com.openframe.data.repository.pinot.PinotDeviceRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import static java.util.Collections.emptyList;

@Service
@Slf4j
public class DeviceFilterService {

    private final PinotDeviceRepository pinotDeviceRepository;

    public DeviceFilterService(PinotDeviceRepository pinotDeviceRepository) {
        this.pinotDeviceRepository = pinotDeviceRepository;
    }

    public CompletableFuture<DeviceFilters> getDeviceFilters(DeviceFilterOptions filters) {
        List<String> statuses = filters != null && filters.getStatuses() != null ?
                filters.getStatuses().stream().map(Enum::name).toList() : emptyList();
        List<String> deviceTypes = filters != null && filters.getDeviceTypes() != null ?
                filters.getDeviceTypes().stream().map(Enum::name).toList() : emptyList();
        List<String> osTypes = filters != null ? filters.getOsTypes() : emptyList();
        List<String> organizationIds = filters != null ? filters.getOrganizationIds() : emptyList();
        List<String> tagNames = filters != null ? filters.getTagNames() : emptyList();

        CompletableFuture<Map<String, Integer>> statusesFuture = CompletableFuture.supplyAsync(() ->
                pinotDeviceRepository.getStatusFilterOptions(statuses, deviceTypes, osTypes, organizationIds, tagNames));
        CompletableFuture<Map<String, Integer>> deviceTypesFuture = CompletableFuture.supplyAsync(() ->
                pinotDeviceRepository.getDeviceTypeFilterOptions(statuses, deviceTypes, osTypes, organizationIds, tagNames));
        CompletableFuture<Map<String, Integer>> osTypesFuture = CompletableFuture.supplyAsync(() ->
                pinotDeviceRepository.getOsTypeFilterOptions(statuses, deviceTypes, osTypes, organizationIds, tagNames));
        CompletableFuture<Map<String, Integer>> organizationsFuture = CompletableFuture.supplyAsync(() ->
                pinotDeviceRepository.getOrganizationFilterOptions(statuses, deviceTypes, osTypes, organizationIds, tagNames));
        CompletableFuture<Map<String, Integer>> tagsFuture = CompletableFuture.supplyAsync(() ->
                pinotDeviceRepository.getTagFilterOptions(statuses, deviceTypes, osTypes, organizationIds, tagNames));
        CompletableFuture<Integer> filteredCountFuture = CompletableFuture.supplyAsync(() ->
                pinotDeviceRepository.getFilteredDeviceCount(statuses, deviceTypes, osTypes, organizationIds, tagNames));

        return CompletableFuture.allOf(
                        statusesFuture, deviceTypesFuture, osTypesFuture,
                        organizationsFuture, tagsFuture, filteredCountFuture)
                .thenApply(v -> DeviceFilters.builder()
                        .statuses(convertMapToFilterOptions(statusesFuture.join()))
                        .deviceTypes(convertMapToFilterOptions(deviceTypesFuture.join()))
                        .osTypes(convertMapToFilterOptions(osTypesFuture.join()))
                        .organizationIds(convertMapToFilterOptions(organizationsFuture.join()))
                        .tags(convertMapToTagFilterOptions(tagsFuture.join()))
                        .filteredCount(filteredCountFuture.join())
                        .build()
                );
    }

    private List<DeviceFilterOption> convertMapToFilterOptions(Map<String, Integer> repositoryOptions) {
        if (repositoryOptions == null || repositoryOptions.isEmpty()) {
            return new ArrayList<>();
        }
        return repositoryOptions.entrySet().stream()
                .map(entry -> DeviceFilterOption.builder()
                        .value(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    private List<TagFilterOption> convertMapToTagFilterOptions(Map<String, Integer> repositoryOptions) {
        if (repositoryOptions == null || repositoryOptions.isEmpty()) {
            return new ArrayList<>();
        }
        return repositoryOptions.entrySet().stream()
                .map(entry -> TagFilterOption.builder()
                        .value(entry.getKey())
                        .label(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .collect(Collectors.toList());
    }

} 