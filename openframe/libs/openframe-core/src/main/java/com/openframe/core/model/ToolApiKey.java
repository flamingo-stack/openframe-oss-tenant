package com.openframe.core.model;

import lombok.Data;

@Data
public class ToolApiKey {
    private String key;
    private APIKeyType type;
    private String keyName;
}
