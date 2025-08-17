package com.openframe.api.mapper;

import com.openframe.api.dto.tool.ToolFilterInput;
import com.openframe.api.dto.tool.ToolFilterOptions;
import org.springframework.stereotype.Component;

@Component
public class GraphQLToolMapper {

    public ToolFilterOptions toToolFilterOptions(ToolFilterInput input) {
        if (input == null) {
            return ToolFilterOptions.builder().build();
        }

        return ToolFilterOptions.builder()
                .enabled(input.getEnabled())
                .type(input.getType())
                .category(input.getCategory())
                .platformCategory(input.getPlatformCategory())
                .build();
    }
}