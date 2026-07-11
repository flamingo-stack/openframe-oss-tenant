'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rejectScriptsMigrationPending } from '../lib/scripts-migration';
import type {
  AgentsModifyResponse,
  CreateScriptSchedulePayload,
  ScriptScheduleDetail,
  UpdateScriptSchedulePayload,
} from '../types/script-schedule.types';
import { scriptScheduleQueryKeys } from './use-script-schedule';

// ============ API Functions ============

// TODO(openframe-rmm): Tactical RMM removed — script-schedule mutations have no backend
// until the OpenFrame RMM scripts API is wired up. All reject so the UI surfaces a clear
// "migration pending" toast instead of a silent no-op. See scripts-migration.ts.
async function createScriptScheduleApi(_payload: CreateScriptSchedulePayload): Promise<ScriptScheduleDetail> {
  return rejectScriptsMigrationPending();
}

async function updateScriptScheduleApi(_params: {
  id: string;
  payload: UpdateScriptSchedulePayload;
}): Promise<ScriptScheduleDetail> {
  return rejectScriptsMigrationPending();
}

async function deleteScriptScheduleApi(_id: string): Promise<void> {
  rejectScriptsMigrationPending();
}

async function replaceScheduleAgentsApi(_params: { id: string; agents: string[] }): Promise<AgentsModifyResponse> {
  return rejectScriptsMigrationPending();
}

async function addScheduleAgentsApi(_params: { id: string; agents: string[] }): Promise<AgentsModifyResponse> {
  return rejectScriptsMigrationPending();
}

async function removeScheduleAgentsApi(_params: { id: string; agents: string[] }): Promise<AgentsModifyResponse> {
  return rejectScriptsMigrationPending();
}

// ============ Hooks ============

export function useCreateScriptSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createScriptScheduleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.all });
    },
  });
}

export function useUpdateScriptSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateScriptScheduleApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.all });
    },
  });
}

export function useDeleteScriptSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteScriptScheduleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.all });
    },
  });
}

export function useReplaceScheduleAgents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replaceScheduleAgentsApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.agents(variables.id) });
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.all });
    },
  });
}

export function useAddScheduleAgents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addScheduleAgentsApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.agents(variables.id) });
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.detail(variables.id) });
    },
  });
}

export function useRemoveScheduleAgents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeScheduleAgentsApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.agents(variables.id) });
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.detail(variables.id) });
    },
  });
}
