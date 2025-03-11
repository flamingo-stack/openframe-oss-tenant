package com.openframe.core.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ToolUrl {
    private String url;
    private String port;
    private ToolUrlType type;
} 