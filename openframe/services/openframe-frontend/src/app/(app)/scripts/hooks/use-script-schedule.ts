'use client';

import { useQuery } from '@tanstack/react-query';
import { rejectScriptsMigrationPending } from '../lib/scripts-migration';
import type {
  ScriptScheduleAgent,
  ScriptScheduleDetail,
  ScriptScheduleHistoryEntry,
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

// TODO(openframe-rmm): Tactical RMM removed — script schedules have no backend until the
// OpenFrame RMM scripts API is wired up. List/agents reads return empty; single-schedule
// and history reads reject so their pages show a not-found/empty state. See
// scripts-migration.ts.
async function fetchScriptSchedules(): Promise<ScriptScheduleListItem[]> {
  return [];
}

async function fetchScriptSchedule(_id: string): Promise<ScriptScheduleDetail> {
  return rejectScriptsMigrationPending();
}

async function fetchScriptScheduleAgents(_id: string): Promise<ScriptScheduleAgent[]> {
  return [];
}

async function fetchScriptScheduleHistory(
  _id: string,
  _limit: number,
  _offset: number,
): Promise<ScriptScheduleHistoryResponse> {
  return rejectScriptsMigrationPending();
}

const EMPTY_SCHEDULES: ScriptScheduleListItem[] = [];
const EMPTY_AGENTS: ScriptScheduleAgent[] = [];
const EMPTY_HISTORY: ScriptScheduleHistoryEntry[] = [];

// ============ Hooks ============

export function useScriptSchedules() {
  const query = useQuery({
    queryKey: scriptScheduleQueryKeys.list(),
    queryFn: fetchScriptSchedules,
  });

  return {
    schedules: query.data ?? EMPTY_SCHEDULES,
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
    agents: query.data ?? EMPTY_AGENTS,
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
    history: query.data?.results ?? EMPTY_HISTORY,
    total: query.data?.total ?? 0,
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
