package com.openframe.external.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Paginated list of devices")
public class DevicesResponse {

    @Schema(description = "List of devices")
    private List<DeviceResponse> devices;

    @Schema(description = "Pagination information")
    private PageInfo pageInfo;

    @Schema(description = "Total count of filtered devices")
    private int filteredCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Pagination information")
    public static class PageInfo {

        @Schema(description = "Whether there is a next page", example = "true")
        private boolean hasNextPage;

        @Schema(description = "Whether there is a previous page", example = "false")
        private boolean hasPreviousPage;

        @Schema(description = "Current page number (1-based)", example = "1")
        private int currentPage;

        @Schema(description = "Total number of pages", example = "10")
        private int totalPages;
    }
} 