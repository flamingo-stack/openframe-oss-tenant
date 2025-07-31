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
@Schema(description = "Pagination information for API responses")
public class PageInfo {
    
    @Schema(description = "Cursor for the next page of results", example = "eyJpZCI6MTIzNDU2fQ==")
    private String nextCursor;
    
    @Schema(description = "Cursor for the previous page of results", example = "eyJpZCI6MTIzNDU1fQ==")
    private String previousCursor;
    
    @Schema(description = "Indicates if there are more results available", example = "true")
    private Boolean hasNext;
    
    @Schema(description = "Indicates if there are previous results available", example = "false")
    private Boolean hasPrevious;
    
    @Schema(description = "Total count of items (optional, may be expensive to calculate)", example = "1500")
    private Long totalCount;
    
    @Schema(description = "Number of items in the current page", example = "20")
    private Integer currentPageSize;
}