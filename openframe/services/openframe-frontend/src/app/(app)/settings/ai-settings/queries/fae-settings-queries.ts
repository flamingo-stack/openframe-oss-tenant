export const GET_FAE_SETTINGS_QUERY = `
  query FaeSettings($organizationId: ID) {
    faeSettings(organizationId: $organizationId) {
      id
      organizationId
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

export const UPDATE_FAE_SETTINGS_MUTATION = `
  mutation UpdateFaeSettings($input: UpdateFaeSettingsInput!) {
    updateFaeSettings(input: $input) {
      faeSettings {
        id
        organizationId
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
