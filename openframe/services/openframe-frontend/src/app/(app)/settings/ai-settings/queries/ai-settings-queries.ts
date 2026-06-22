// AI logic config (tenant-wide per agent). Avatar/appearance live on ClientView.
const AGENT_AI_CONFIG_FIELDS = `
  id
  agentType
  llmProvider
  providerModel
  answerStyle
  customPrompt
  quickActions {
    id
    name
    instructions
  }
  createdAt
  updatedAt
`;

const CLIENT_VIEW_FIELDS = `
  id
  organizationId
  assistantName
  assistantAvatar {
    imageUrl
    hash
  }
  applicationTheme
  accentColor
  createdAt
  updatedAt
`;

export const GET_CLIENT_AI_CONFIG_QUERY = `
  query ClientAiConfig {
    clientAiConfig {
      ${AGENT_AI_CONFIG_FIELDS}
    }
  }
`;

export const GET_ADMIN_AI_CONFIG_QUERY = `
  query AdminAiConfig {
    adminAiConfig {
      ${AGENT_AI_CONFIG_FIELDS}
    }
  }
`;

export const GET_CLIENT_VIEW_QUERY = `
  query ClientView($organizationId: ID) {
    clientView(organizationId: $organizationId) {
      ${CLIENT_VIEW_FIELDS}
    }
  }
`;

export const UPDATE_CLIENT_AI_CONFIG_MUTATION = `
  mutation UpdateClientAiConfig($input: AgentAiConfigInput!) {
    updateClientAiConfig(input: $input) {
      aiConfig {
        ${AGENT_AI_CONFIG_FIELDS}
      }
      userErrors {
        message
      }
    }
  }
`;

export const UPDATE_ADMIN_AI_CONFIG_MUTATION = `
  mutation UpdateAdminAiConfig($input: AgentAiConfigInput!) {
    updateAdminAiConfig(input: $input) {
      aiConfig {
        ${AGENT_AI_CONFIG_FIELDS}
      }
      userErrors {
        message
      }
    }
  }
`;

export const UPDATE_CLIENT_VIEW_MUTATION = `
  mutation UpdateClientView($organizationId: ID, $input: ClientViewInput!) {
    updateClientView(organizationId: $organizationId, input: $input) {
      view {
        ${CLIENT_VIEW_FIELDS}
      }
      userErrors {
        message
      }
    }
  }
`;
