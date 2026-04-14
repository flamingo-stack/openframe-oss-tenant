import { GraphQLClient, gql, type RequestDocument, type Variables } from 'graphql-request';
import { tokenService } from './tokenService';

export interface FeatureFlagResponse {
  name: string;
  enabled: boolean;
}

const FEATURE_FLAGS_QUERY = gql`
  query FeatureFlags($names: [String!]) {
    feFeatureFlags(names: $names) {
      name
      enabled
    }
  }
`;

class FeatureFlagsService {
  private graphQlClient: GraphQLClient | null = null;
  private currentEndpoint: string | null = null;

  private async initializeClient(): Promise<GraphQLClient> {
    if (this.graphQlClient && this.currentEndpoint) {
      const token = tokenService.getCurrentToken();
      if (token) {
        this.graphQlClient.setHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        });
      }
      return this.graphQlClient;
    }

    const baseUrl = tokenService.getCurrentApiBaseUrl();
    const token = tokenService.getCurrentToken();

    if (!baseUrl || !token) {
      throw new Error('API base URL or token not available');
    }

    const endpoint = `${baseUrl}/chat/graphql`;

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

  async fetchFeatureFlags(names?: readonly string[]): Promise<FeatureFlagResponse[] | null> {
    try {
      await tokenService.ensureTokenReady();
      const data = await this.request<{ feFeatureFlags: FeatureFlagResponse[] }>(
        FEATURE_FLAGS_QUERY,
        names ? { names: [...names] } : undefined,
      );
      return data.feFeatureFlags ?? [];
    } catch (error) {
      console.error('[FeatureFlags] Failed to fetch feature flags:', error);
      return null;
    }
  }
}

export const featureFlagsService = new FeatureFlagsService();
