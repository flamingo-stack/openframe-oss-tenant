'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { type UserRecord, usersQueryKeys } from './use-users';

async function fetchUser(userId: string): Promise<UserRecord | null> {
  const res = await apiClient.get<UserRecord>(`api/users/${encodeURIComponent(userId)}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to load employee (${res.status})`);
  }
  return res.data;
}

export function useUser(userId: string) {
  const query = useQuery({
    queryKey: usersQueryKeys.detail(userId),
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
