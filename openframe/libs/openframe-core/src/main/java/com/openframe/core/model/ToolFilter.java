package com.openframe.core.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolFilter {
    private Boolean enabled;
    private String type;
    private String search;
    private String category;
    private String platformCategory;
} 