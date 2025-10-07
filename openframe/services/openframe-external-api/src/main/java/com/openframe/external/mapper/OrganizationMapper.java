package com.openframe.external.mapper;

import com.openframe.api.dto.organization.OrganizationList;
import com.openframe.data.document.organization.Organization;
import com.openframe.external.dto.organization.OrganizationResponse;
import com.openframe.external.dto.organization.OrganizationsResponse;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

/**
 * Mapper for converting between Organization entities and external API DTOs.
 */
@Component
public class OrganizationMapper extends BaseRestMapper {

    /**
     * Convert Organization entity to OrganizationResponse DTO.
     */
    public OrganizationResponse toResponse(Organization organization) {
        if (organization == null) {
            return null;
        }

        return OrganizationResponse.builder()
                .id(organization.getId())
                .name(organization.getName())
                .organizationId(organization.getOrganizationId())
                .category(organization.getCategory())
                .numberOfEmployees(organization.getNumberOfEmployees())
                .websiteUrl(organization.getWebsiteUrl())
                .monthlyRevenue(organization.getMonthlyRevenue())
                .contractStartDate(organization.getContractStartDate())
                .contractEndDate(organization.getContractEndDate())
                .createdAt(organization.getCreatedAt())
                .updatedAt(organization.getUpdatedAt())
                .deleted(organization.getDeleted())
                .deletedAt(organization.getDeletedAt())
                .build();
    }

    /**
     * Convert OrganizationList to OrganizationsResponse.
     */
    public OrganizationsResponse toOrganizationsResponse(OrganizationList organizationList) {
        if (organizationList == null || organizationList.getOrganizations() == null) {
            return OrganizationsResponse.builder()
                    .organizations(java.util.Collections.emptyList())
                    .total(0)
                    .build();
        }

        var responses = organizationList.getOrganizations().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return OrganizationsResponse.builder()
                .organizations(responses)
                .total(responses.size())
                .build();
    }
}
