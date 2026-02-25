'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/api-client';

// GraphQL query based on provided payload
const GET_INTEGRATED_TOOLS_QUERY = `
  query GetIntegratedTools($filter: ToolFilterInput, $search: String) {
    integratedTools(filter: $filter, search: $search) {
      tools {
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
  }
`;

export type ToolUrl = { url: string; port?: number | null; type?: string | null };
export type ApiKey = { key: string; type?: string | null; keyName?: string | null };
export type Credentials = { username?: string | null; password?: string | null; apiKey?: ApiKey | null };
export type IntegratedTool = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  toolUrls?: ToolUrl[] | null;
  type?: string | null;
  toolType?: string | null;
  category?: string | null;
  platformCategory?: string | null;
  enabled?: boolean | null;
  credentials?: Credentials | null;
  layer?: string | null;
  layerOrder?: number | null;
  layerColor?: string | null;
};

interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

type IntegratedToolsResponse = {
  integratedTools: { tools: IntegratedTool[] };
};

export function useIntegratedTools() {
  const { toast } = useToast();
  const [tools, setTools] = useState<IntegratedTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegratedTools = useCallback(
    async (filter: Record<string, any> = { enabled: true, category: null }, search: string = '') => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<GraphQlResponse<IntegratedToolsResponse>>('/api/graphql', {
          query: GET_INTEGRATED_TOOLS_QUERY,
          variables: { filter, search },
        });

        if (!response.ok) {
          throw new Error(response.error || `Request failed with status ${response.status}`);
        }

        const graphql = response.data;
        if (graphql?.errors && graphql.errors.length) {
          throw new Error(graphql.errors[0].message);
        }

        const result = graphql?.data?.integratedTools?.tools ?? [];
        setTools(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch integrated tools';
        setError(message);
        toast({ title: 'Error fetching tools', description: message, variant: 'destructive' });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  return { tools, isLoading, error, fetchIntegratedTools };
}
