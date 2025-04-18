package com.openframe.core.model;

import lombok.Data;

@Data
public class ToolFilter {
    private Boolean enabled;
    private String type;
    private String search;
    private String category;
    private String platformCategory;
} 