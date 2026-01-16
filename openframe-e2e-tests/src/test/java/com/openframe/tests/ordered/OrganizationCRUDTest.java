package com.openframe.tests.ordered;

import com.openframe.api.OrganizationApi;
import com.openframe.data.dto.organization.Organization;
import com.openframe.data.dto.request.CreateOrganizationRequest;
import com.openframe.db.OrganizationDB;
import com.openframe.tests.ordered.base.AuthorizedTest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("authorized")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class OrganizationCRUDTest extends AuthorizedTest {

    @Order(1)
    @ParameterizedTest
    @MethodSource("com.openframe.data.dataProviders.OrganizationDataProvider#createOrganization")
    public void createOrganization(CreateOrganizationRequest createOrganizationRequest) {
        Organization organization = OrganizationApi.createOrganization(createOrganizationRequest);
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
                .isEqualTo(createOrganizationRequest);
    }

    @Order(2)
    @Test
    public void retrieveOrganization() {
        Organization organizationInDB = OrganizationDB.getNotDefaultOrganization();
        assertThat(organizationInDB).as("No Organization in DB to retrieve").isNotNull();
        Organization retrievedOrganization = OrganizationApi.retrieveOrganization(organizationInDB.getId());
        assertThat(retrievedOrganization).usingRecursiveComparison()
                .ignoringFields("monthlyRevenue")
                .isEqualTo(organizationInDB);
    }

    @Order(3)
    @ParameterizedTest
    @MethodSource("com.openframe.data.dataProviders.OrganizationDataProvider#updateOrganization")
    public void updateOrganization(CreateOrganizationRequest updateOrganizationRequest) {
        Organization organization = OrganizationDB.getNotDefaultOrganization();
        assertThat(organization).as("No Organization in DB to update").isNotNull();
        organization = OrganizationApi.updateOrganization(organization.getId(), updateOrganizationRequest);
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
                .isEqualTo(updateOrganizationRequest);
    }

    @Order(4)
    @Test
    public void deleteOrganization() {
        Organization organization = OrganizationDB.getNotDefaultOrganization();
        assertThat(organization).as("No Organization in DB to delete").isNotNull();
        OrganizationApi.deleteOrganization(organization);
        organization = OrganizationDB.getOrganization(organization.getId());
        assertThat(organization.getDeleted()).isTrue();
        assertThat(organization.getDeletedAt()).isNotNull();
    }

    @Order(5)
    @Test
    public void retrieveAllOrganizations() {
        List<String> apiOrganizationsIds = OrganizationApi.getOrganizationIds();
        List<String> activeOrganizationIds = OrganizationDB.getActiveOrganizationIds();
        List<String> deletedOrganizationIds = OrganizationDB.getDeletedOrganizationIds();
        assertThat(apiOrganizationsIds).containsExactlyInAnyOrderElementsOf(activeOrganizationIds);
        assertThat(apiOrganizationsIds).doesNotContainAnyElementsOf(deletedOrganizationIds);
    }
}
