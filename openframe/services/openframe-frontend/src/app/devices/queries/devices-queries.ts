/**
 * GraphQL queries for devices
 */

export const GET_DEVICE_FILTERS_QUERY = `
  query GetDeviceFilters($filter: DeviceFilterInput) {
    deviceFilters(filter: $filter) {
      statuses {
        value
        count
      }
      deviceTypes {
        value
        count
      }
      osTypes {
        value
        count
      }
      organizationIds {
        value
        label
        count
      }
      tags {
        value
        label
        count
      }
      filteredCount
    }
  }
`;

export const GET_DEVICES_QUERY = `
  query GetDevices($filter: DeviceFilterInput, $pagination: CursorPaginationInput, $search: String, $sort: SortInput) {
    devices(filter: $filter, pagination: $pagination, search: $search, sort: $sort) {
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
          organization {
            id
            organizationId
            name
            image {
              imageUrl
            }
          }
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
          toolConnections {
            id
            machineId
            toolType
            agentToolId
            status
            metadata
            connectedAt
            lastSyncAt
            disconnectedAt
          }
          tags {
            id
            name
            description
            color
            organizationId
            createdAt
            createdBy
          }
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

export const GET_DEVICE_QUERY = `
  query GetDevice($machineId: String!) {
    device(machineId: $machineId) {
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
      organization {
        id
        organizationId
        name
        image {
          imageUrl
        }
      }
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
      }
      toolConnections {
        id
        machineId
        toolType
        agentToolId
        status
        metadata
        connectedAt
        lastSyncAt
        disconnectedAt
      }
      installedAgents {
        id
        machineId
        agentType
        version
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_DEVICES_OVERVIEW_QUERY = `
  query GetDevicesOverview($filter: DeviceFilterInput, $pagination: CursorPaginationInput, $search: String) {
    devices(filter: $filter, pagination: $pagination, search: $search) {
      edges {
        node {
          status
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
