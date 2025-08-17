package com.openframe.external.dto.device;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Tag information")
public class TagResponse {

    @Schema(description = "Unique tag identifier", example = "tag-123")
    private String id;

    @Schema(description = "Tag name", example = "production")
    private String name;

    @Schema(description = "Tag description", example = "Production environment servers")
    private String description;

    @Schema(description = "Tag color (hex code)", example = "#FF5733")
    private String color;

    @Schema(description = "Organization ID")
    private String organizationId;

    @Schema(description = "Creation timestamp")
    private Instant createdAt;

    @Schema(description = "Created by user ID")
    private String createdBy;
} 