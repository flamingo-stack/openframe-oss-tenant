package com.openframe.data.repository.mongo;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.tool.filter.ToolQueryFilter;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

public interface CustomIntegratedToolRepository {
    Query buildToolQuery(ToolQueryFilter filter, String search);
    List<IntegratedTool> findToolsWithFilters(ToolQueryFilter filter, String search);
    List<String> findDistinctTypes();
    List<String> findDistinctCategories();
    List<String> findDistinctPlatformCategories();
}