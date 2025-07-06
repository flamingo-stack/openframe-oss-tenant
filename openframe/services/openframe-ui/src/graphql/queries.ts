import { gql } from '@apollo/client/core';

export const GET_INTEGRATED_TOOLS = gql`
  query GetIntegratedTools($filter: ToolFilter) {
    integratedTools(filter: $filter) {
      id
      name
      description
      icon
      toolUrls {
        url
        port
        type
      }
      type
      toolType
      category
      platformCategory
      enabled
      credentials {
        username
        password
        apiKey {
          key
          type
          keyName
        }
      }
      layer
      layerOrder
      layerColor
      metricsPath
      healthCheckEndpoint
      healthCheckInterval
      connectionTimeout
      readTimeout
      allowedEndpoints
    }
  }
`;

export const GET_DEVICES = gql`
  query GetDevices($filter: DeviceFilterInput, $pagination: PaginationInput, $search: String) {
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
          }
    }
  }
      pageInfo {
        hasNextPage
        hasPreviousPage
        currentPage
        totalPages
      }
      filteredCount
    }
  }
`;

export const GET_DEVICE_FILTERS = gql`
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

// TODO: This query will be used for individual device pages, deep linking, and real-time updates
export const GET_DEVICE_BY_ID = gql`
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
    }
  }
`; 