package com.openframe.data.repository.pinot;

import java.util.List;
import java.util.Map;

public interface PinotDeviceRepository {

    Map<String, Integer> getStatusFilterOptions(
        List<String> statuses,
        List<String> deviceTypes,
        List<String> osTypes,
        List<String> organizationIds,
        List<String> tagNames
    );
    
    Map<String, Integer> getDeviceTypeFilterOptions(
        List<String> statuses,
        List<String> deviceTypes,
        List<String> osTypes,
        List<String> organizationIds,
        List<String> tagNames
    );
    
    Map<String, Integer> getOsTypeFilterOptions(
        List<String> statuses,
        List<String> deviceTypes,
        List<String> osTypes,
        List<String> organizationIds,
        List<String> tagNames
    );
    
    Map<String, Integer> getOrganizationFilterOptions(
        List<String> statuses,
        List<String> deviceTypes,
        List<String> osTypes,
        List<String> organizationIds,
        List<String> tagNames
    );
    
    Map<String, Integer> getTagFilterOptions(
        List<String> statuses,
        List<String> deviceTypes,
        List<String> osTypes,
        List<String> organizationIds,
        List<String> tagNames
    );

    int getFilteredDeviceCount(
        List<String> statuses,
        List<String> deviceTypes,
        List<String> osTypes,
        List<String> organizationIds,
        List<String> tagNames
    );
} 