package com.openframe.core.model.tool.filter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolQueryFilter {
    private Boolean enabled;
    private String type;
    private String category;
    private String platformCategory;
}