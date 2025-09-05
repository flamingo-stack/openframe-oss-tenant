/**
 * GraphQL queries for devices
 */

export const GET_DEVICES_QUERY = `
  query GetDevices($filter: DeviceFilterInput, $pagination: CursorPaginationInput, $search: String) {
    devices(filter: $filter, pagination: $pagination, search: $search) {
      edges {
        node {
          id
          machineId
          hostname
          displayName
          ip
          macAddress
          osUuid
          agentVersion
          status
          lastSeen
          organizationId
          serialNumber
          manufacturer
          model
          type
          osType
          osVersion
          osBuild
          timezone
          registeredAt
          updatedAt
          tags {
            id
            name
            description
            color
            organizationId
            createdAt
            createdBy
            __typename
          }
          __typename
        }
        cursor
        __typename
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        __typename
      }
      filteredCount
      __typename
    }
  }
`