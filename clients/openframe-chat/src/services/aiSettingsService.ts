import { GraphQLClient, gql, type RequestDocument, type Variables } from 'graphql-request';
import { tokenService } from './tokenService';

/** Which AI agent the settings belong to. The chat client is the customer-facing
 *  assistant, so it always reads the CLIENT agent's settings. */
export type AgentType = 'CLIENT' | 'ADMIN';

const CHAT_AGENT_TYPE: AgentType = 'CLIENT';

export interface AiQuickAction {
  id: string;
  name: string;
  instructions: string;
}

export interface AiSettingsResponse {
  id: string;
  organizationId: string | null;
  agentType: AgentType;
  assistantName: string;
  assistantAvatar: { imageUrl: string; hash: string | null } | null;
  llmProvider: string;
  providerModel: string;
  applicationTheme: string;
  accentColor: string;
  answerStyle: string | null;
  customPrompt: string | null;
  quickActions: AiQuickAction[] | null;
  createdAt: string;
  updatedAt: string | null;
}

// (`aiSettings` on /chat/graphql — settings are scoped per agent)
const AI_SETTINGS_QUERY = gql`
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

class AiSettingsService {
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

  /** Returns the CLIENT agent's AiSettings record, or `null` when none exists yet. Throws on transport/GraphQL errors. */
  async fetchAiSettings(organizationId: string | null = null): Promise<AiSettingsResponse | null> {
    await tokenService.ensureTokenReady();
    const data = await this.request<{ aiSettings: AiSettingsResponse | null }>(AI_SETTINGS_QUERY, {
      organizationId,
      agentType: CHAT_AGENT_TYPE,
    });
    return data.aiSettings ?? null;
  }
}

export const aiSettingsService = new AiSettingsService();
