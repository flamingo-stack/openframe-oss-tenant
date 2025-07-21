package com.openframe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceFilters {
    private List<FilterOption> statuses;
    private List<FilterOption> deviceTypes;
    private List<FilterOption> osTypes;
    private List<FilterOption> organizationIds;
    private List<TagFilterOption> tags;
    private Integer filteredCount;
} 