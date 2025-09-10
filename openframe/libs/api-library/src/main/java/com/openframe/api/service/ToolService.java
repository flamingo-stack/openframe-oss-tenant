package com.openframe.api.service;

import com.openframe.api.dto.tool.ToolFilterOptions;
import com.openframe.api.dto.tool.ToolFilters;
import com.openframe.api.dto.tool.ToolList;
import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.tool.filter.ToolQueryFilter;
import com.openframe.data.repository.tool.IntegratedToolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToolService {
    
    private final IntegratedToolRepository integratedToolRepository;

    public ToolList queryTools(ToolFilterOptions filterOptions, String search) {
        log.debug("Querying tools with filter: {}, search: {}", filterOptions, search);
        
        ToolQueryFilter queryFilter = buildQueryFilter(filterOptions);
        List<IntegratedTool> tools = integratedToolRepository.findToolsWithFilters(queryFilter, search);
        
        return ToolList.builder()
                .tools(tools)
                .build();
    }

    public ToolFilters getToolFilters() {
        log.debug("Getting available tool filters");
        
        List<String> types = integratedToolRepository.findDistinctTypes();
        List<String> categories = integratedToolRepository.findDistinctCategories();
        List<String> platformCategories = integratedToolRepository.findDistinctPlatformCategories();
        
        return ToolFilters.builder()
                .types(types)
                .categories(categories)
                .platformCategories(platformCategories)
                .build();
    }
    
    private ToolQueryFilter buildQueryFilter(ToolFilterOptions filterOptions) {
        if (filterOptions == null) {
            return ToolQueryFilter.builder().build();
        }
        
        return ToolQueryFilter.builder()
                .enabled(filterOptions.getEnabled())
                .type(filterOptions.getType())
                .category(filterOptions.getCategory())
                .platformCategory(filterOptions.getPlatformCategory())
                .build();
    }
} 