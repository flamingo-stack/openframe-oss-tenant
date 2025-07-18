package com.openframe.external.mapper;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolCredentials;
import com.openframe.core.model.ToolUrl;
import com.openframe.core.model.ToolApiKey;
import com.openframe.external.dto.ToolResponse;
import com.openframe.external.dto.ToolUrlResponse;
import com.openframe.external.dto.ToolCredentialsResponse;
import com.openframe.external.dto.ToolApiKeyResponse;
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

    public List<ToolResponse> toToolResponseList(List<IntegratedTool> tools) {
        if (tools == null) {
            return null;
        }

        return tools.stream()
                .map(this::toToolResponse)
                .collect(Collectors.toList());
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

    private List<ToolUrl> toToolUrlList(List<ToolUrlResponse> toolUrlResponses) {
        if (toolUrlResponses == null) {
            return null;
        }
        return toolUrlResponses.stream()
                .map(this::toToolUrl)
                .collect(Collectors.toList());
    }

    private ToolUrl toToolUrl(ToolUrlResponse toolUrlResponse) {
        if (toolUrlResponse == null) {
            return null;
        }
        return ToolUrl.builder()
                .url(toolUrlResponse.getUrl())
                .port(toolUrlResponse.getPort())
                .type(toolUrlResponse.getType() != null ? 
                    com.openframe.core.model.ToolUrlType.valueOf(toolUrlResponse.getType()) : null)
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

    private ToolCredentials toToolCredentials(ToolCredentialsResponse credentialsResponse) {
        if (credentialsResponse == null) {
            return null;
        }
        ToolCredentials credentials = new ToolCredentials();
        credentials.setUsername(credentialsResponse.getUsername());
        credentials.setPassword(credentialsResponse.getPassword());
        credentials.setApiKey(toToolApiKey(credentialsResponse.getApiKey()));
        return credentials;
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

    private ToolApiKey toToolApiKey(ToolApiKeyResponse apiKeyResponse) {
        if (apiKeyResponse == null) {
            return null;
        }
        ToolApiKey apiKey = new ToolApiKey();
        apiKey.setKey(apiKeyResponse.getKey());
        apiKey.setType(apiKeyResponse.getType() != null ? 
            com.openframe.core.model.APIKeyType.valueOf(apiKeyResponse.getType()) : null);
        apiKey.setKeyName(apiKeyResponse.getKeyName());
        return apiKey;
    }
} 