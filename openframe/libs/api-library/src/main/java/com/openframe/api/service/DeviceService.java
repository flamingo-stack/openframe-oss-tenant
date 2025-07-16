package com.openframe.api.service;

import com.openframe.api.dto.DeviceFilterOptions;
import com.openframe.api.dto.DeviceQueryResult;
import com.openframe.api.dto.PageInfo;
import com.openframe.api.dto.PaginationCriteria;
import com.openframe.core.model.Machine;
import com.openframe.core.model.MachineTag;
import com.openframe.core.model.Tag;
import com.openframe.core.model.device.filter.MachineQueryFilter;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.MachineTagRepository;
import com.openframe.data.repository.mongo.TagRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
                                          PaginationCriteria paginationCriteria,
                                          String search) {
        log.debug("Querying devices with filter: {}, pagination: {}, search: {}",
                filterOptions, paginationCriteria, search);

        PaginationCriteria normalizedPagination = paginationCriteria.normalize();
        Query query = buildDeviceQuery(filterOptions, search);
        long totalCount = countMachines(query);

        PageRequest pageRequest = createPageRequest(normalizedPagination);
        List<Machine> machines = findMachinesWithPagination(query, pageRequest);

        int totalPages = (int) Math.ceil((double) totalCount / normalizedPagination.getPageSize());

        PageInfo pageInfo = PageInfo.builder()
                .hasNextPage(normalizedPagination.getPage() < totalPages)
                .hasPreviousPage(normalizedPagination.getPage() > 1)
                .currentPage(normalizedPagination.getPage())
                .totalPages(totalPages)
                .build();

        return DeviceQueryResult.builder()
                .devices(machines)
                .pageInfo(pageInfo)
                .filteredCount(machines.size())
                .build();
    }

    private List<Machine> findMachinesWithPagination(@NotNull Query query, @NotNull PageRequest pageRequest) {
        log.debug("Finding machines with pagination - page: {}, size: {}",
                pageRequest.getPageNumber(), pageRequest.getPageSize());
        List<Machine> machines = machineRepository.findMachinesWithPagination(query, pageRequest);
        log.debug("Found {} machines", machines.size());
        return machines;
    }

    private long countMachines(@NotNull Query query) {
        log.debug("Counting machines with query");
        long count = machineRepository.countMachines(query);
        log.debug("Machine count: {}", count);
        return count;
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

    private PageRequest createPageRequest(PaginationCriteria pagination) {
        int normalizedPage = Math.max(PaginationCriteria.DEFAULT_PAGE, pagination.getPage());
        int normalizedPageSize = Math.min(PaginationCriteria.MAX_PAGE_SIZE,
                Math.max(1, pagination.getPageSize()));
        return PageRequest.of(normalizedPage - 1, normalizedPageSize, Sort.by(SORT_FIELD).ascending());
    }
} 