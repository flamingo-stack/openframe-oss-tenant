import { gql } from '@apollo/client/core';

export const GET_INTEGRATED_TOOLS = gql`
  query GetIntegratedTools($filter: ToolFilterInput, $search: String) {
    integratedTools(filter: $filter, search: $search) {
      tools {
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
  }
`;

export const GET_DEVICES = gql`
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
`;

// Log-related GraphQL queries
export const GET_LOGS = gql`
  query GetLogs($filter: LogFilterInput, $pagination: CursorPaginationInput, $search: String) {
    logs(filter: $filter, pagination: $pagination, search: $search) {
      edges {
        node {
          toolEventId
          eventType
          ingestDay
          toolType
          severity
          userId
          deviceId
          summary
          timestamp
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const GET_LOG_FILTERS = gql`
  query GetLogFilters($filter: LogFilterInput) {
    logFilters(filter: $filter) {
      toolTypes
      eventTypes
      severities
    }
  }
`;

export const GET_LOG_DETAILS = gql`
  query GetLogDetails($ingestDay: String!, $toolType: String!, $eventType: String!, $timestamp: Instant!, $toolEventId: ID!) {
    logDetails(ingestDay: $ingestDay, toolType: $toolType, eventType: $eventType, timestamp: $timestamp, toolEventId: $toolEventId) {
      toolEventId
      eventType
      ingestDay
      toolType
      severity
      userId
      deviceId
      message
      timestamp
      details
    }
  }
`; 