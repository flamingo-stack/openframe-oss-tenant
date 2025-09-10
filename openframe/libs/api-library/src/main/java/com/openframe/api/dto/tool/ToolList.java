package com.openframe.api.dto.tool;

import com.openframe.data.document.tool.IntegratedTool;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolList {
    private List<IntegratedTool> tools;
}