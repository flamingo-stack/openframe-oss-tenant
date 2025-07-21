package com.openframe.api.datafetcher;

import java.util.List;

import com.netflix.graphql.dgs.DgsComponent;
import com.netflix.graphql.dgs.DgsQuery;
import com.netflix.graphql.dgs.InputArgument;
import com.openframe.api.service.ToolService;
import com.openframe.core.model.ToolFilter;
import com.openframe.core.model.IntegratedTool;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@DgsComponent
@RequiredArgsConstructor
@Slf4j
public class ToolsDataFetcher {
    
    private final ToolService toolService;
    
    @DgsQuery
    public List<IntegratedTool> integratedTools(@InputArgument ToolFilter filter) {
        log.debug("Getting integrated tools with filter: {}", filter);
        return toolService.getIntegratedTools(filter);
    }
} 