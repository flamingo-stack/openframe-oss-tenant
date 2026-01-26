package com.openframe.tests;

import com.openframe.data.dto.organization.CreateOrganizationRequest;
import com.openframe.data.dto.organization.Organization;
import com.openframe.tests.base.AuthorizedTest;
import org.junit.jupiter.api.*;

import java.util.List;

import static com.openframe.api.OrganizationApi.*;
import static com.openframe.data.generator.OrganizationGenerator.createOrganizationRequest;
import static com.openframe.data.generator.OrganizationGenerator.updateOrganizationRequest;
import static com.openframe.db.collections.OrganizationsCollection.findOrganization;
import static com.openframe.db.collections.OrganizationsCollection.findOrganizationIds;
import static org.assertj.core.api.Assertions.assertThat;

@Tag("authorized")
@DisplayName("Organizations")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class OrganizationsTest extends AuthorizedTest {

    @Order(1)
    @Test
    @DisplayName("Create Organization")
    public void testCreateOrganization() {
        CreateOrganizationRequest request = createOrganizationRequest(true);
        Organization organization = createOrganization(request);
        assertThat(organization.getId()).isNotNull();
        assertThat(organization.getOrganizationId()).isNotNull();
        assertThat(organization.getIsDefault()).isFalse();
        assertThat(organization.getCreatedAt()).isNotNull();
        assertThat(organization.getUpdatedAt()).isNotNull();
        assertThat(organization.getDeleted()).isFalse();
        assertThat(organization.getDeletedAt()).isNull();
        assertThat(organization.getContactInformation()).isNotNull();
        assertThat(organization.getContactInformation().getMailingAddress())
                .isEqualTo(organization.getContactInformation().getPhysicalAddress());
        assertThat(organization).usingRecursiveComparison()
                .ignoringFields("id", "organizationId", "isDefault", "createdAt",
                        "updatedAt", "deleted", "deletedAt", "contactInformation.mailingAddress")
                .isEqualTo(request);
    }

    @Order(2)
    @Test
    @DisplayName("Retrieve Organization")
    public void testRetrieveOrganization() {
        Organization dbOrganization = findOrganization(false, false);
        assertThat(dbOrganization).as("No Organization in DB to retrieve").isNotNull();
        Organization apiOrganization = retrieveOrganization(dbOrganization.getId());
        assertThat(apiOrganization).usingRecursiveComparison()
                .ignoringFields("monthlyRevenue")
                .isEqualTo(dbOrganization);
    }

    @Order(3)
    @Test
    @DisplayName("Update Organization")
    public void testUpdateOrganization() {
        CreateOrganizationRequest request = updateOrganizationRequest(false);
        Organization organization = findOrganization(false, false);
        assertThat(organization).as("No Organization in DB to update").isNotNull();
        organization = updateOrganization(organization.getId(), request);
        assertThat(organization.getId()).isNotNull();
        assertThat(organization.getOrganizationId()).isNotNull();
        assertThat(organization.getIsDefault()).isFalse();
        assertThat(organization.getCreatedAt()).isNotNull();
        assertThat(organization.getUpdatedAt()).isNotNull();
        assertThat(organization.getDeleted()).isFalse();
        assertThat(organization.getDeletedAt()).isNull();
        assertThat(organization).usingRecursiveComparison()
                .ignoringFields("id", "organizationId", "isDefault", "createdAt",
                        "updatedAt", "deleted", "deletedAt")
                .isEqualTo(request);
    }

    @Order(4)
    @Test
    @DisplayName("Delete Organization")
    public void testDeleteOrganization() {
        Organization organization = findOrganization(false, false);
        assertThat(organization).as("No Organization in DB to delete").isNotNull();
        deleteOrganization(organization);
        organization = findOrganization(organization.getId());
        assertThat(organization.getDeleted()).isTrue();
        assertThat(organization.getDeletedAt()).isNotNull();
    }

    @Order(5)
    @Test
    @DisplayName("Retrieve Active Organizations")
    public void testRetrieveAllOrganizations() {
        List<String> apiOrganizationsIds = getOrganizationIds();
        List<String> activeOrganizationIds = findOrganizationIds(false);
        List<String> deletedOrganizationIds = findOrganizationIds(true);
        assertThat(apiOrganizationsIds).containsExactlyInAnyOrderElementsOf(activeOrganizationIds);
        assertThat(apiOrganizationsIds).doesNotContainAnyElementsOf(deletedOrganizationIds);
    }
}
