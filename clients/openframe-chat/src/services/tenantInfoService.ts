import { GraphQLClient, gql, type RequestDocument, type Variables } from 'graphql-request';
import { tokenService } from './tokenService';

/** Editable tenant (MSP organization) profile shown on the welcome screen. */
export interface TenantInfo {
  id: string;
  name: string | null;
  website: string | null;
  image: { imageUrl: string; hash: string | null } | null;
}

// The welcome screen shows which organization the user is signing into. The
// tenantInfo query is served by both /api and /chat; the chat client reads it
// from /chat/graphql like its other GraphQL data.
const TENANT_INFO_QUERY = gql`
  query ChatTenantInfo {
    tenantInfo {
      id
      name
      website
      image {
        imageUrl
        hash
      }
    }
  }
`;

class TenantInfoService {
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
   * Loads the current authenticated tenant's profile (name, website, logo).
   * Returns `null` when the tenant has no record. Throws on transport/GraphQL errors.
   */
  async fetchTenantInfo(): Promise<TenantInfo | null> {
    await tokenService.ensureTokenReady();
    const data = await this.request<{ tenantInfo: TenantInfo | null }>(TENANT_INFO_QUERY);
    return data.tenantInfo ?? null;
  }
}

export const tenantInfoService = new TenantInfoService();
