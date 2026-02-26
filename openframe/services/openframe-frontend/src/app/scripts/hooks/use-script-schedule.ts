'use client';

import { useQuery } from '@tanstack/react-query';
import { tacticalApiClient } from '@/lib/tactical-api-client';
import type {
  ScriptScheduleAgent,
  ScriptScheduleDetail,
  ScriptScheduleHistoryResponse,
  ScriptScheduleListItem,
} from '../types/script-schedule.types';

// ============ Query Keys ============

export const scriptScheduleQueryKeys = {
  all: ['script-schedules'] as const,
  list: () => [...scriptScheduleQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...scriptScheduleQueryKeys.all, 'detail', id] as const,
  agents: (id: string) => [...scriptScheduleQueryKeys.all, 'agents', id] as const,
  history: (id: string, limit: number, offset: number) =>
    [...scriptScheduleQueryKeys.all, 'history', id, limit, offset] as const,
};

// ============ API Functions ============

async function fetchScriptSchedules(): Promise<ScriptScheduleListItem[]> {
  const res = await tacticalApiClient.getScriptSchedules();
  if (!res.ok) {
    throw new Error(res.error || `Failed to load schedules (${res.status})`);
  }
  return res.data ?? [];
}

async function fetchScriptSchedule(id: string): Promise<ScriptScheduleDetail> {
  const res = await tacticalApiClient.getScriptSchedule(id);
  if (!res.ok) {
    throw new Error(res.error || `Failed to load schedule (${res.status})`);
  }
  return res.data;
}

async function fetchScriptScheduleAgents(id: string): Promise<ScriptScheduleAgent[]> {
  const res = await tacticalApiClient.getScriptScheduleAgents(id);
  if (!res.ok) {
    throw new Error(res.error || `Failed to load agents (${res.status})`);
  }
  return res.data ?? [];
}

async function fetchScriptScheduleHistory(
  id: string,
  limit: number,
  offset: number,
): Promise<ScriptScheduleHistoryResponse> {
  const res = await tacticalApiClient.getScriptScheduleHistory(id, { limit, offset });
  if (!res.ok) {
    throw new Error(res.error || `Failed to load history (${res.status})`);
  }
  return res.data;
}

// ============ Hooks ============

export function useScriptSchedules() {
  const query = useQuery({
    queryKey: scriptScheduleQueryKeys.list(),
    queryFn: fetchScriptSchedules,
  });

  return {
    schedules: query.data ?? [],
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useScriptSchedule(id: string) {
  const query = useQuery({
    queryKey: scriptScheduleQueryKeys.detail(id),
    queryFn: () => fetchScriptSchedule(id),
    enabled: !!id,
  });

  return {
    schedule: query.data ?? null,
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useScriptScheduleAgents(id: string) {
  const query = useQuery({
    queryKey: scriptScheduleQueryKeys.agents(id),
    queryFn: () => fetchScriptScheduleAgents(id),
    enabled: !!id,
  });

  return {
    agents: query.data ?? [],
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useScriptScheduleHistory(
  id: string,
  options: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
  const query = useQuery({
    queryKey: scriptScheduleQueryKeys.history(id, options.limit, options.offset),
    queryFn: () => fetchScriptScheduleHistory(id, options.limit, options.offset),
    enabled: !!id,
  });

  return {
    history: query.data?.results ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
