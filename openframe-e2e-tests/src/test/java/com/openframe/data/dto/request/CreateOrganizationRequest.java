package com.openframe.data.dto.request;

import com.openframe.data.dto.organization.ContactInformationDto;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * Shared DTO for creating a new organization.
 * Note: organizationId is generated automatically on the backend as UUID.
 */
@Data
@Builder
public class CreateOrganizationRequest {
    String name;
    String category;
    Integer numberOfEmployees;
    String websiteUrl;
    String notes;
    ContactInformationDto contactInformation;
    String monthlyRevenue;
    LocalDate contractStartDate;
    LocalDate contractEndDate;
}

