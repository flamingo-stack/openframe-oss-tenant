export const GET_AI_SETTINGS_QUERY = `
  query AiSettings($organizationId: ID, $agentType: AgentType!) {
    aiSettings(organizationId: $organizationId, agentType: $agentType) {
      id
      organizationId
      agentType
      assistantName
      assistantAvatar {
        imageUrl
        hash
      }
      llmProvider
      providerModel
      applicationTheme
      accentColor
      answerStyle
      customPrompt
      quickActions {
        id
        name
        instructions
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_AI_SETTINGS_MUTATION = `
  mutation UpdateAiSettings($input: UpdateAiSettingsInput!) {
    updateAiSettings(input: $input) {
      aiSettings {
        id
        organizationId
        agentType
        assistantName
        assistantAvatar {
          imageUrl
          hash
        }
        llmProvider
        providerModel
        applicationTheme
        accentColor
        answerStyle
        customPrompt
        quickActions {
          id
          name
          instructions
        }
        createdAt
        updatedAt
      }
      userErrors {
        message
      }
    }
  }
`;
