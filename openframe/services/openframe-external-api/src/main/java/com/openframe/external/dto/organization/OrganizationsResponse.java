package com.openframe.external.dto.organization;

import com.openframe.api.dto.organization.OrganizationResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for organization list in external REST API.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationsResponse {
    private List<OrganizationResponse> organizations;
    private Integer total;
}
