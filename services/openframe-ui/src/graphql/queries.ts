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