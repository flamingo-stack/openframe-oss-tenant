package com.openframe.core.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ToolFilter {
    private Boolean enabled;
    private String type;
    private String search;
    private String category;
    private String platformCategory;
} 