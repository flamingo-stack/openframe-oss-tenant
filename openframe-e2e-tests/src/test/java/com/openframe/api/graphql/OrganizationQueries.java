package com.openframe.api.graphql;

public class OrganizationQueries {
    public static final String ORGANIZATION_NAMES = """
            query {
                organizations {
                    edges {
                        node { name }
                    }
                }
            }
            """;

    public static final String ORGANIZATION_IDS = """
            query {
                organizations {
                    edges {
                        node { id }
                    }
                }
            }
            """;

    public static final String FULL_ORGANIZATION = """
            query($id: String!) {
                organization(id: $id) {
                    id
                    name
                    organizationId
                    category
                    numberOfEmployees
                    websiteUrl
                    notes
                    contactInformation {
                        contacts {
                            contactName
                            title
                            phone
                            email
                        }
                        physicalAddress {
                            street1
                            street2
                            city
                            state
                            postalCode
                            country
                        }
                        mailingAddress {
                            street1
                            street2
                            city
                            state
                            postalCode
                            country
                        }
                        mailingAddressSameAsPhysical
                    }
                    monthlyRevenue
                    contractStartDate
                    contractEndDate
                    createdAt
                    updatedAt
                    isDefault
                    deleted
                    deletedAt
                }
            }
            """;
}
