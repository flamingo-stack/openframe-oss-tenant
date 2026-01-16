package com.openframe.data.dto.organization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.bson.BsonType;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonRepresentation;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Organization document representing a company or entity in the system.
 * Contains business-related information such as revenue, employees, and contract details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Organization {
    @BsonId
    @BsonRepresentation(BsonType.OBJECT_ID)
    private String id;
    private String organizationId;
    private String name;
    private String category;
    private Integer numberOfEmployees;
    private String websiteUrl;
    private String notes;
    private ContactInformationDto contactInformation;
    private String monthlyRevenue;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private Boolean isDefault;
    private Instant createdAt;
    private Instant updatedAt;
    private Boolean deleted;
    private Instant deletedAt;
}

