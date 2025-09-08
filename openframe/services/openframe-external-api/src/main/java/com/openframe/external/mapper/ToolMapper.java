package com.openframe.external.mapper;

import com.openframe.api.dto.tool.ToolFilterOptions;
import com.openframe.api.dto.tool.ToolFilters;
import com.openframe.api.dto.tool.ToolList;
import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.tool.ToolApiKey;
import com.openframe.data.document.tool.ToolCredentials;
import com.openframe.data.document.tool.ToolUrl;
import com.openframe.external.dto.tool.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ToolMapper {

    public ToolResponse toToolResponse(IntegratedTool tool) {
        if (tool == null) {
            return null;
        }

        return ToolResponse.builder()
                .id(tool.getId())
                .name(tool.getName())
                .description(tool.getDescription())
                .icon(tool.getIcon())
                .toolUrls(toToolUrlResponseList(tool.getToolUrls()))
                .type(tool.getType())
                .toolType(tool.getToolType())
                .category(tool.getCategory())
                .platformCategory(tool.getPlatformCategory())
                .enabled(tool.isEnabled())
                .credentials(toToolCredentialsResponse(tool.getCredentials()))
                .build();
    }

    public ToolsResponse toToolsResponse(ToolList result) {
        if (result == null) {
            return ToolsResponse.builder()
                    .tools(List.of())
                    .build();
        }

        List<ToolResponse> tools = result.getTools().stream()
                .map(this::toToolResponse)
                .collect(Collectors.toList());

        return ToolsResponse.builder()
                .tools(tools)
                .build();
    }

    public ToolFilterResponse toToolFilterResponse(ToolFilters filters) {
        if (filters == null) {
            return ToolFilterResponse.builder()
                    .types(List.of())
                    .categories(List.of())
                    .platformCategories(List.of())
                    .build();
        }

        return ToolFilterResponse.builder()
                .types(filters.getTypes())
                .categories(filters.getCategories())
                .platformCategories(filters.getPlatformCategories())
                .build();
    }

    private List<ToolUrlResponse> toToolUrlResponseList(List<ToolUrl> toolUrls) {
        if (toolUrls == null) {
            return null;
        }
        return toolUrls.stream()
                .map(this::toToolUrlResponse)
                .collect(Collectors.toList());
    }

    private ToolUrlResponse toToolUrlResponse(ToolUrl toolUrl) {
        if (toolUrl == null) {
            return null;
        }
        return ToolUrlResponse.builder()
                .url(toolUrl.getUrl())
                .port(toolUrl.getPort())
                .type(toolUrl.getType() != null ? toolUrl.getType().name() : null)
                .build();
    }

    private ToolCredentialsResponse toToolCredentialsResponse(ToolCredentials credentials) {
        if (credentials == null) {
            return null;
        }
        return ToolCredentialsResponse.builder()
                .username(credentials.getUsername())
                .password(credentials.getPassword())
                .apiKey(toToolApiKeyResponse(credentials.getApiKey()))
                .build();
    }

    private ToolApiKeyResponse toToolApiKeyResponse(ToolApiKey apiKey) {
        if (apiKey == null) {
            return null;
        }
        return ToolApiKeyResponse.builder()
                .key(apiKey.getKey())
                .type(apiKey.getType() != null ? apiKey.getType().name() : null)
                .keyName(apiKey.getKeyName())
                .build();
    }

    public ToolFilterOptions toToolFilterOptions(ToolFilterCriteria criteria) {
        if (criteria == null) {
            return ToolFilterOptions.builder().build();
        }
        
        return ToolFilterOptions.builder()
                .enabled(criteria.getEnabled())
                .type(criteria.getType())
                .category(criteria.getCategory())
                .platformCategory(criteria.getPlatformCategory())
                .build();
    }
} 