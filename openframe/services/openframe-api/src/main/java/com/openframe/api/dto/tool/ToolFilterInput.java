package com.openframe.api.dto.tool;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolFilterInput {
    private Boolean enabled;
    private String type;
    private String category;
    private String platformCategory;
}