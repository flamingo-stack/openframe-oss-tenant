package com.openframe.api.service;

import com.openframe.api.dto.device.DeviceFilterOptions;
import com.openframe.api.dto.device.DeviceQueryResult;
import com.openframe.api.dto.shared.CursorPageInfo;
import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.data.document.device.Machine;
import com.openframe.data.document.device.MachineTag;
import com.openframe.data.document.device.filter.MachineQueryFilter;
import com.openframe.data.document.tool.Tag;
import com.openframe.data.repository.device.MachineRepository;
import com.openframe.data.repository.device.MachineTagRepository;
import com.openframe.data.repository.tool.TagRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
@Validated
@RequiredArgsConstructor
public class DeviceService {

    private static final String SORT_FIELD = "machineId";
    private final MachineRepository machineRepository;
    private final TagRepository tagRepository;
    private final MachineTagRepository machineTagRepository;

    public Optional<Machine> findByMachineId(@NotBlank String machineId) {
        log.debug("Finding machine by ID: {}", machineId);
        Optional<Machine> result = machineRepository.findByMachineId(machineId);
        log.debug("Found machine: {}", result.isPresent());
        return result;
    }

    public DeviceQueryResult queryDevices(DeviceFilterOptions filterOptions,
                                          CursorPaginationCriteria paginationCriteria,
                                          String search) {
        log.debug("Querying devices with filter: {}, pagination: {}, search: {}",
                filterOptions, paginationCriteria, search);

        CursorPaginationCriteria normalizedPagination = paginationCriteria.normalize();
        Query query = buildDeviceQuery(filterOptions, search);
        
        List<Machine> pageItems = fetchPageItems(query, normalizedPagination);
        boolean hasNextPage = pageItems.size() == normalizedPagination.getLimit();
        
        CursorPageInfo pageInfo = buildPageInfo(pageItems, hasNextPage, normalizedPagination.hasCursor());

        return DeviceQueryResult.builder()
                .devices(pageItems)
                .pageInfo(pageInfo)
                .filteredCount(pageItems.size())
                .build();
    }
    
    private List<Machine> fetchPageItems(@NotNull Query query, CursorPaginationCriteria criteria) {
        List<Machine> machines = machineRepository.findMachinesWithCursor(
            query, criteria.getCursor(), criteria.getLimit() + 1);
        return machines.size() > criteria.getLimit() 
            ? machines.subList(0, criteria.getLimit())
            : machines;
    }
    
    private CursorPageInfo buildPageInfo(List<Machine> pageItems, boolean hasNextPage, boolean hasPreviousPage) {
        String startCursor = pageItems.isEmpty() ? null : pageItems.getFirst().getId();
        String endCursor = pageItems.isEmpty() ? null : pageItems.getLast().getId();
        
        return CursorPageInfo.builder()
                .hasNextPage(hasNextPage)
                .hasPreviousPage(hasPreviousPage)
                .startCursor(startCursor)
                .endCursor(endCursor)
                .build();
    }

    private Query buildDeviceQuery(DeviceFilterOptions filter, String search) {
        MachineQueryFilter queryFilter = mapToMachineQueryFilter(filter);
        Query query = machineRepository.buildDeviceQuery(queryFilter, search);

        if (filter != null && filter.getTagNames() != null && !filter.getTagNames().isEmpty()) {
            List<String> machineIds = resolveTagNamesToMachineIds(filter.getTagNames());
            if (!machineIds.isEmpty()) {
                query.addCriteria(Criteria.where(SORT_FIELD).in(machineIds));
            } else {
                query.addCriteria(Criteria.where(SORT_FIELD).exists(false));
            }
        }
        return query;
    }

    private List<String> resolveTagNamesToMachineIds(List<String> tagNames) {
        List<Tag> tags = tagRepository.findByNameIn(tagNames);
        List<String> tagIds = tags.stream()
                .map(Tag::getId)
                .collect(Collectors.toList());
        if (tagIds.isEmpty()) {
            return new ArrayList<>();
        }
        List<MachineTag> machineTags = machineTagRepository.findByTagIdIn(tagIds);
        return machineTags.stream()
                .map(MachineTag::getMachineId)
                .distinct()
                .collect(Collectors.toList());
    }

    private MachineQueryFilter mapToMachineQueryFilter(DeviceFilterOptions filter) {
        if (filter == null) {
            return new MachineQueryFilter();
        }
        MachineQueryFilter queryFilter = new MachineQueryFilter();
        queryFilter.setStatuses(filter.getStatuses() != null ?
                filter.getStatuses().stream().map(Enum::name).collect(Collectors.toList()) : null);
        queryFilter.setDeviceTypes(filter.getDeviceTypes() != null ?
                filter.getDeviceTypes().stream().map(Enum::name).collect(Collectors.toList()) : null);
        queryFilter.setOsTypes(filter.getOsTypes());
        queryFilter.setOrganizationIds(filter.getOrganizationIds());
        queryFilter.setTagNames(filter.getTagNames());
        return queryFilter;
    }
} 