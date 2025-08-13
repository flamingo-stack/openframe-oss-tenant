package com.openframe.api.dto.tool;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolFilters {
    private List<String> types;
    private List<String> categories;
    private List<String> platformCategories;
}