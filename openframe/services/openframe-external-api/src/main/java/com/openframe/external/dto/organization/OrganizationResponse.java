package com.openframe.external.dto.organization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Response DTO for organization data in external REST API.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationResponse {
    private String id;
    private String name;
    private String organizationId;  // Generated as UUID
    private String category;
    private Integer numberOfEmployees;
    private String websiteUrl;
    private BigDecimal monthlyRevenue;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private Instant createdAt;
    private Instant updatedAt;
    private Boolean deleted;
    private Instant deletedAt;
}
