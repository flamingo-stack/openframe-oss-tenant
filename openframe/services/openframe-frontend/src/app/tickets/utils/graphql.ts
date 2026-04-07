export interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: unknown }>;
}

export function extractGraphQlData<T>(response: {
  ok: boolean;
  data?: GraphQlResponse<T>;
  error?: string;
  status?: number;
}): T {
  if (!response.ok) {
    throw new Error(response.error || `Request failed with status ${response.status}`);
  }

  const gql = response.data;
  if (gql?.errors && gql.errors.length > 0) {
    throw new Error(gql.errors[0].message || 'GraphQL error occurred');
  }

  if (!gql?.data) {
    throw new Error('No data received from server');
  }

  return gql.data;
}
