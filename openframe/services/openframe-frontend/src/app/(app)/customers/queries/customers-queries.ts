export const GET_ORGANIZATIONS_QUERY = `#graphql
  query GetOrganizations($search: String, $first: Int, $after: String, $filter: OrganizationFilterInput, $orderBy: OrganizationSortInput) {
    organizations(search: $search, first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
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
            hash
          }
          createdAt
          updatedAt
          lastActivityAt
          status
          statusChangedAt
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
  query GetOrganizationsMin($search: String, $first: Int) {
    organizations(search: $search, first: $first) {
      edges {
        node {
          id
          organizationId
          name
          isDefault
          image {
            imageUrl
            hash
          }
        }
      }
    }
  }
`;

export const GET_ORGANIZATION_BY_ORGANIZATION_ID_QUERY = `#graphql
  query GetOrganizationByOrganizationId($organizationId: String!) {
    organizationByOrganizationId(organizationId: $organizationId) {
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
        hash
      }
      monthlyRevenue
      contractStartDate
      contractEndDate
      isDefault
      createdAt
      updatedAt
      status
      statusChangedAt
    }
  }
`;

export const GET_ORGANIZATION_BY_ID_QUERY = `#graphql
  query GetOrganizationById($id: ID!) {
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
        hash
      }
      monthlyRevenue
      contractStartDate
      contractEndDate
      isDefault
      createdAt
      updatedAt
      status
      statusChangedAt
    }
  }
`;
