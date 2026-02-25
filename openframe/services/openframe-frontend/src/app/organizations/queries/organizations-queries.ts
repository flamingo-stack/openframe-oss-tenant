export const GET_ORGANIZATIONS_QUERY = `#graphql
  query GetOrganizations($search: String, $pagination: CursorPaginationInput) {
    organizations(search: $search, pagination: $pagination) {
      edges {
        node {
          id
          organizationId
          name
          category
          contactInformation {
            contacts {
              contactName
              email
            }
          }
          numberOfEmployees
          websiteUrl
          monthlyRevenue
          contractStartDate
          contractEndDate
          image {
            imageUrl
          }
          createdAt
          updatedAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      filteredCount
    }
  }
`;

export const GET_ORGANIZATIONS_MIN_QUERY = `#graphql
  query GetOrganizationsMin($search: String, $pagination: CursorPaginationInput) {
    organizations(search: $search, pagination: $pagination) {
      edges {
        node {
          id
          organizationId
          name
          isDefault
          image {
            imageUrl
          }
        }
      }
    }
  }
`;

export const GET_ORGANIZATION_BY_ID_QUERY = `#graphql
  query GetOrganizationById($id: String!) {
    organization(id: $id) {
      id
      organizationId
      name
      category
      numberOfEmployees
      websiteUrl
      notes
      contactInformation {
        mailingAddressSameAsPhysical
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
      }
      image {
        imageUrl
      }
      monthlyRevenue
      contractStartDate
      contractEndDate
      isDefault
      createdAt
      updatedAt
      deleted
      deletedAt
    }
  }
`;
