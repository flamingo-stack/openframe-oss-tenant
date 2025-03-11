package com.openframe.core.model;

import lombok.Data;

@Data
public class APIKey {
    private String key;
    private APIKeyType type;
    private String keyName;
}
