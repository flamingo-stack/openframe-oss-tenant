import { GraphQLClient, gql, type RequestDocument, type Variables } from 'graphql-request';
import { tokenService } from './tokenService';

export interface FaeQuickAction {
  id: string;
  name: string;
  instructions: string;
}

export interface FaeSettingsResponse {
  id: string;
  organizationId: string | null;
  assistantName: string;
  assistantAvatar: { imageUrl: string; hash: string | null } | null;
  llmProvider: string;
  providerModel: string;
  applicationTheme: string;
  accentColor: string;
  answerStyle: string | null;
  customPrompt: string | null;
  quickActions: FaeQuickAction[] | null;
  createdAt: string;
  updatedAt: string | null;
}

// (`faeSettings` on /chat/graphql)
const FAE_SETTINGS_QUERY = gql`
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

class FaeSettingsService {
  private graphQlClient: GraphQLClient | null = null;
  private currentEndpoint: string | null = null;

  private async initializeClient(): Promise<GraphQLClient> {
    const baseUrl = tokenService.getCurrentApiBaseUrl();
    const token = tokenService.getCurrentToken();

    if (!baseUrl || !token) {
      throw new Error('API base URL or token not available');
    }

    const endpoint = `${baseUrl}/chat/graphql`;

    // Reuse the cached client only while the endpoint is unchanged; a new API
    // base URL recreates the client so requests never hit a stale server.
    if (this.graphQlClient && this.currentEndpoint === endpoint) {
      this.graphQlClient.setHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });
      return this.graphQlClient;
    }

    this.graphQlClient = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      fetch: fetch,
    });

    this.currentEndpoint = endpoint;
    return this.graphQlClient;
  }

  private async request<T>(document: RequestDocument, variables?: Variables): Promise<T> {
    const client = await this.initializeClient();
    return client.request<T>(document, variables);
  }

  /** Returns the FaeSettings record, or `null` when none exists yet. Throws on transport/GraphQL errors. */
  async fetchFaeSettings(organizationId: string | null = null): Promise<FaeSettingsResponse | null> {
    await tokenService.ensureTokenReady();
    const data = await this.request<{ faeSettings: FaeSettingsResponse | null }>(FAE_SETTINGS_QUERY, {
      organizationId,
    });
    return data.faeSettings ?? null;
  }
}

export const faeSettingsService = new FaeSettingsService();
