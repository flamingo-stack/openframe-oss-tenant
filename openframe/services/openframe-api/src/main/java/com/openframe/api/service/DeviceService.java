package com.openframe.api.service;

import com.openframe.core.model.Machine;
import com.openframe.core.model.Tag;
import com.openframe.core.model.MachineTag;
import com.openframe.api.dto.device.DeviceFilterInput;
import com.openframe.api.dto.device.PaginationInput;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.TagRepository;
import com.openframe.data.repository.mongo.MachineTagRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class DeviceService {
    
    private static final String SORT_FIELD = "machineId";
    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    
    private final MachineRepository machineRepository;
    private final TagRepository tagRepository;
    private final MachineTagRepository machineTagRepository;

    public DeviceService(
            MachineRepository machineRepository,
            TagRepository tagRepository,
            MachineTagRepository machineTagRepository) {
        this.machineRepository = machineRepository;
        this.tagRepository = tagRepository;
        this.machineTagRepository = machineTagRepository;
    }

    public Optional<Machine> findByMachineId(String machineId) {
        log.debug("Finding machine by ID: {}", machineId);
        validateMachineId(machineId);
        Optional<Machine> result = machineRepository.findByMachineId(machineId);
        log.debug("Found machine: {}", result.isPresent());
        return result;
    }

    public List<Machine> findMachinesWithPagination(Query query, PageRequest pageRequest) {
        log.debug("Finding machines with pagination - page: {}, size: {}", 
                pageRequest.getPageNumber(), pageRequest.getPageSize());
        validateQuery(query);
        validatePageRequest(pageRequest);
        List<Machine> machines = machineRepository.findMachinesWithPagination(query, pageRequest);
        log.debug("Found {} machines", machines.size());
        return machines;
    }

    public long countMachines(Query query) {
        log.debug("Counting machines with query");
        validateQuery(query);
        long count = machineRepository.countMachines(query);
        log.debug("Machine count: {}", count);
        return count;
    }

    public Query buildDeviceQuery(DeviceFilterInput filter, String search) {
        log.debug("Building device query with filter: {}, search: {}", filter, search);
        Query query = new Query();
        applyDeviceFilters(query, filter);
        applySearchCriteria(query, search);
        return query;
    }

    public PageRequest createPageRequest(int page, int pageSize) {
        log.debug("Creating page request - page: {}, pageSize: {}", page, pageSize);
        validatePageAndPageSize(page, pageSize);
        
        int normalizedPage = Math.max(DEFAULT_PAGE, page);
        int normalizedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        PageRequest result = PageRequest.of(normalizedPage - 1, normalizedPageSize, Sort.by(SORT_FIELD).ascending());
        log.debug("Created page request: {}", result);
        return result;
    }

    public PageRequest createPageRequestFromInput(PaginationInput pagination) {
        if (pagination == null) {
            return createPageRequest(DEFAULT_PAGE, DEFAULT_PAGE_SIZE);
        }
        return createPageRequest(pagination.getPage(), pagination.getPageSize());
    }

    public PaginationInput normalizePagination(PaginationInput pagination) {
        if (pagination == null) {
            return PaginationInput.builder()
                    .page(DEFAULT_PAGE)
                    .pageSize(DEFAULT_PAGE_SIZE)
                    .build();
        }
        
        int page = Math.max(DEFAULT_PAGE, pagination.getPage() != null ? pagination.getPage() : DEFAULT_PAGE);
        int pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pagination.getPageSize() != null ? pagination.getPageSize() : DEFAULT_PAGE_SIZE));
        
        return PaginationInput.builder()
                .page(page)
                .pageSize(pageSize)
                .build();
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

    private void applySearchCriteria(Query query, String search) {
        if (StringUtils.hasText(search)) {
            Criteria searchCriteria = new Criteria().orOperator(
                    Criteria.where("hostname").regex(search, "i"),
                    Criteria.where("displayName").regex(search, "i"),
                    Criteria.where("ip").regex(search, "i"),
                    Criteria.where("serialNumber").regex(search, "i"),
                    Criteria.where("manufacturer").regex(search, "i"),
                    Criteria.where("model").regex(search, "i")
            );
            query.addCriteria(searchCriteria);
        }
    }

    private void applyDeviceFilters(Query query, DeviceFilterInput filter) {
        if (filter == null) {
            return;
        }
        if (filter.getStatuses() != null && !filter.getStatuses().isEmpty()) {
            List<String> statusStrings = filter.getStatuses().stream()
                    .map(status -> status.name())
                    .collect(Collectors.toList());
            query.addCriteria(Criteria.where("status").in(statusStrings));
        }
        if (filter.getDeviceTypes() != null && !filter.getDeviceTypes().isEmpty()) {
            List<String> typeStrings = filter.getDeviceTypes().stream()
                    .map(Enum::name)
                    .collect(Collectors.toList());
            query.addCriteria(Criteria.where("type").in(typeStrings));
        }
        if (filter.getOsTypes() != null && !filter.getOsTypes().isEmpty()) {
            query.addCriteria(Criteria.where("osType").in(filter.getOsTypes()));
        }
        if (filter.getOrganizationIds() != null && !filter.getOrganizationIds().isEmpty()) {
            query.addCriteria(Criteria.where("organizationId").in(filter.getOrganizationIds()));
        }
        if (filter.getTagNames() != null && !filter.getTagNames().isEmpty()) {
            List<String> machineIds = resolveTagNamesToMachineIds(filter.getTagNames());
            if (!machineIds.isEmpty()) {
                query.addCriteria(Criteria.where(SORT_FIELD).in(machineIds));
            } else {
                query.addCriteria(Criteria.where(SORT_FIELD).exists(false));
            }
        }
    }

    private void validateMachineId(String machineId) {
        if (!StringUtils.hasText(machineId)) {
            throw new IllegalArgumentException("Machine ID cannot be null or empty");
        }
    }

    private void validateQuery(Query query) {
        if (query == null) {
            throw new IllegalArgumentException("Query cannot be null");
        }
    }

    private void validatePageRequest(PageRequest pageRequest) {
        if (pageRequest == null) {
            throw new IllegalArgumentException("PageRequest cannot be null");
        }
    }

    private void validatePageAndPageSize(int page, int pageSize) {
        if (page < 1) {
            throw new IllegalArgumentException("Page must be greater than 0");
        }
        if (pageSize < 1) {
            throw new IllegalArgumentException("Page size must be greater than 0");
        }
        if (pageSize > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Page size cannot exceed " + MAX_PAGE_SIZE);
        }
    }
} 