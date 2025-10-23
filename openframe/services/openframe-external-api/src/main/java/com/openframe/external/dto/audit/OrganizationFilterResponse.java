package com.openframe.external.dto.audit;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Organization filter option with ID and name")
public class OrganizationFilterResponse {

    @Schema(description = "Organization ID (for filtering)", example = "org-123")
    private String id;

    @Schema(description = "Organization name (for display)", example = "Acme Corporation")
    private String name;

}