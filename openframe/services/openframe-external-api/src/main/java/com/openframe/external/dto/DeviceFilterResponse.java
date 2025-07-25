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
@Schema(description = "Device filter options with counts")
public class DeviceFilterResponse {

    @Schema(description = "Available device statuses with counts")
    private List<FilterOption> statuses;

    @Schema(description = "Available device types with counts")
    private List<FilterOption> deviceTypes;

    @Schema(description = "Available OS types with counts")
    private List<FilterOption> osTypes;

    @Schema(description = "Available organization IDs with counts")
    private List<FilterOption> organizationIds;

    @Schema(description = "Available tags with counts")
    private List<TagFilterOption> tags;

    @Schema(description = "Total count of filtered devices")
    private Integer filteredCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Filter option with count")
    public static class FilterOption {

        @Schema(description = "Filter value", example = "ACTIVE")
        private String value;

        @Schema(description = "Count of devices with this filter value", example = "42")
        private Integer count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Tag filter option with count")
    public static class TagFilterOption {

        @Schema(description = "Tag name/value", example = "production")
        private String value;

        @Schema(description = "Tag display label", example = "Production Environment")
        private String label;

        @Schema(description = "Count of devices with this tag", example = "15")
        private Integer count;
    }
} 