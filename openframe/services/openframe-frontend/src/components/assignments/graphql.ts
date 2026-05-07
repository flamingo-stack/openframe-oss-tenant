import { apiClient } from '@/lib/api-client';

interface GraphQlEnvelope<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function postGraphQl<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await apiClient.post<GraphQlEnvelope<T>>('/api/graphql', { query, variables });
  if (!response.ok) throw new Error(response.error || `Request failed with status ${response.status}`);
  const envelope = response.data;
  if (envelope?.errors?.length) throw new Error(envelope.errors[0].message);
  if (!envelope?.data) throw new Error('No data received from server');
  return envelope.data;
}
