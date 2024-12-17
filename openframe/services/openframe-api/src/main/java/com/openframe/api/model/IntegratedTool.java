package com.openframe.api.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class IntegratedTool {
    private String id;
    private String name;
    private String description;
    private String icon;
    private String url;
    private boolean enabled;
    private String type;
} 