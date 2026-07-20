import { GraphQLClient, gql, type RequestDocument, type Variables } from 'graphql-request';
import { tokenService } from './tokenService';

export interface AiQuickAction {
  id: string;
  name: string;
  instructions: string;
}

/**
 * Flattened, chat-facing view of the two backend collections the client cares
 * about: appearance from `clientView` and quick actions from `clientAiConfig`.
 */
export interface AiSettingsResponse {
  /** ClientView id (avatar entity key). */
  id: string;
  assistantName: string;
  assistantAvatar: { imageUrl: string; hash: string | null } | null;
  applicationTheme: string;
  accentColor: string;
  /** True → show the OpenFrame defaults from the Product Hub; false → `quickActions` customs. */
  quickActionsIsDefault: boolean;
  quickActions: AiQuickAction[] | null;
  /** Effective LLM provider/model for this device's org (tenant default when
   *  no per-customer override; null when nothing is configured anywhere). */
  llmProvider: string | null;
  providerModel: string | null;
}

interface ClientViewGql {
  id: string;
  assistantName: string;
  assistantAvatar: { imageUrl: string; hash: string | null } | null;
  applicationTheme: string;
  accentColor: string;
}

interface ClientAiConfigGql {
  quickActionsIsDefault: boolean | null;
  quickActions: AiQuickAction[] | null;
  llmProvider: string | null;
  providerModel: string | null;
}

// The chat reads the client assistant's appearance (clientView), its quick
// actions and the effective LLM provider/model (clientAiConfig) in a single
// request. For a machine (agent) caller the backend resolves BOTH root fields
// to the device's organization automatically (ClientViewResolver /
// ClientAiConfigResolver derive the org from the token's machineId), falling
// back to the tenant default when the org has no override.
const AI_SETTINGS_QUERY = gql`
  query ChatAiSettings($organizationId: ID) {
    clientView(organizationId: $organizationId) {
      id
      assistantName
      assistantAvatar {
        imageUrl
        hash
      }
      applicationTheme
      accentColor
    }
    clientAiConfig {
      quickActionsIsDefault
      llmProvider
      providerModel
      quickActions {
        id
        name
        instructions
      }
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

  /**
   * Loads the client assistant's appearance, quick actions and effective
   * provider/model. Returns `null` when neither collection has a record yet.
   * Throws on transport/GraphQL errors. `organizationId` stays null: the
   * backend resolves the device's organization from the machine token.
   */
  async fetchAiSettings(organizationId: string | null = null): Promise<AiSettingsResponse | null> {
    await tokenService.ensureTokenReady();
    const data = await this.request<{ clientView: ClientViewGql | null; clientAiConfig: ClientAiConfigGql | null }>(
      AI_SETTINGS_QUERY,
      { organizationId },
    );

    const view = data.clientView;
    const aiConfig = data.clientAiConfig;
    if (!view && !aiConfig) {
      return null;
    }

    // Empty strings read as "not configured" by the consumers (branding falls
    // back to the default name; appearance leaves the ODS defaults in place).
    return {
      id: view?.id ?? '',
      assistantName: view?.assistantName ?? '',
      assistantAvatar: view?.assistantAvatar ?? null,
      applicationTheme: view?.applicationTheme ?? '',
      accentColor: view?.accentColor ?? '',
      // BE default is true: hub defaults apply until the tenant customizes.
      quickActionsIsDefault: aiConfig?.quickActionsIsDefault ?? true,
      quickActions: aiConfig?.quickActions ?? null,
      llmProvider: aiConfig?.llmProvider ?? null,
      providerModel: aiConfig?.providerModel ?? null,
    };
  }
}

export const aiSettingsService = new AiSettingsService();
