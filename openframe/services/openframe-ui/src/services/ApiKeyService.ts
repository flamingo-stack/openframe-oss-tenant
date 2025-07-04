import { restClient } from '../apollo/apolloClient';

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  lastUsed?: string;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
}

export interface CreateApiKeyRequest {
  name: string;
  description?: string;
  expiresAt?: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  fullKey: string;
}

export interface ApiKeyUsageStats {
  keyId: string;
  totalRequests: number;
  requestsToday: number;
  requestsThisWeek: number;
  requestsThisMonth: number;
  lastUsedAt?: string;
  rateLimitExceeded: number;
}

export class ApiKeyService {
  private static readonly BASE_URL = '/api-keys';

  /**
   * Get all API keys for the current user
   */
  static async getApiKeys(): Promise<ApiKey[]> {
    try {
      const response = await restClient.get<ApiKey[]>(`${import.meta.env.VITE_API_URL}${this.BASE_URL}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      throw error;
    }
  }

  /**
   * Get a specific API key by ID
   */
  static async getApiKey(id: string): Promise<ApiKey> {
    try {
      const response = await restClient.get<ApiKey>(`${import.meta.env.VITE_API_URL}${this.BASE_URL}/${id}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new API key
   */
  static async createApiKey(request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    try {
      const response = await restClient.post<CreateApiKeyResponse>(
        `${import.meta.env.VITE_API_URL}${this.BASE_URL}`,
        request
      );
      return response;
    } catch (error) {
      console.error('Failed to create API key:', error);
      throw error;
    }
  }

  /**
   * Update an existing API key
   */
  static async updateApiKey(id: string, request: UpdateApiKeyRequest): Promise<ApiKey> {
    try {
      const response = await restClient.put<ApiKey>(
        `${import.meta.env.VITE_API_URL}${this.BASE_URL}/${id}`,
        request
      );
      return response;
    } catch (error) {
      console.error(`Failed to update API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an API key
   */
  static async deleteApiKey(id: string): Promise<void> {
    try {
      await restClient.delete(`${import.meta.env.VITE_API_URL}${this.BASE_URL}/${id}`);
    } catch (error) {
      console.error(`Failed to delete API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * Enable or disable an API key
   */
  static async toggleApiKey(id: string, enabled: boolean): Promise<ApiKey> {
    try {
      const response = await restClient.put<ApiKey>(
        `${import.meta.env.VITE_API_URL}${this.BASE_URL}/${id}`,
        { enabled }
      );
      return response;
    } catch (error) {
      console.error(`Failed to toggle API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get usage statistics for an API key
   */
  static async getApiKeyUsage(keyId: string): Promise<ApiKeyUsageStats> {
    try {
      const response = await restClient.get<ApiKeyUsageStats>(
        `${import.meta.env.VITE_API_URL}${this.BASE_URL}/${keyId}/usage`
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch usage stats for API key ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * Regenerate an API key (creates new secret)
   */
  static async regenerateApiKey(id: string): Promise<CreateApiKeyResponse> {
    try {
      const response = await restClient.post<CreateApiKeyResponse>(
        `${import.meta.env.VITE_API_URL}${this.BASE_URL}/${id}/regenerate`
      );
      return response;
    } catch (error) {
      console.error(`Failed to regenerate API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * Format API key for display (show full key ID)
   */
  static formatKeyForDisplay(keyId: string): string {
    return keyId || '';
  }

  /**
   * Get status color for API key
   */
  static getStatusColor(apiKey: ApiKey): string {
    if (!apiKey.enabled) return 'red';
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return 'orange';
    return 'green';
  }

  /**
   * Get status text for API key
   */
  static getStatusText(apiKey: ApiKey): string {
    if (!apiKey.enabled) return 'Disabled';
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return 'Expired';
    return 'Active';
  }
} 