/**
 * GraphQL queries for devices
 */

export const GET_DEVICE_FILTERS_QUERY = `
  query GetDeviceFilters($filter: DeviceFilterInput) {
    deviceFilters(filter: $filter) {
      statuses {
        value
        count
        __typename
      }
      deviceTypes {
        value
        count
        __typename
      }
      osTypes {
        value
        count
        __typename
      }
      organizationIds {
        value
        count
        __typename
      }
      tags {
        value
        label
        count
        __typename
      }
      filteredCount
      __typename
    }
  }
`

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
            __typename
          }
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
    }
  }
`