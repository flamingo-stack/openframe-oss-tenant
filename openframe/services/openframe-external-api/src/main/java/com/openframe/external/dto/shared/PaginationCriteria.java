package com.openframe.external.dto.shared;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Pagination criteria for API requests")
public class PaginationCriteria {
    
    @Schema(description = "Cursor for pagination", example = "eyJpZCI6MTIzNDU2fQ==")
    private String cursor;
    
    @Schema(description = "Number of items to return", example = "20", minimum = "1", maximum = "100")
    private Integer limit;
    
    public Integer getLimit() {
        return limit != null && limit > 0 && limit <= 100 ? limit : 20;
    }
}