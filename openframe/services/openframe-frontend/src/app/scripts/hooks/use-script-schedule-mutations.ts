'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { scriptScheduleQueryKeys } from './use-script-schedule'
import type {
  CreateScriptSchedulePayload,
  UpdateScriptSchedulePayload,
  ScriptScheduleDetail,
  AgentsModifyResponse,
} from '../types/script-schedule.types'

// ============ API Functions ============

async function createScriptScheduleApi(payload: CreateScriptSchedulePayload): Promise<ScriptScheduleDetail> {
  const res = await tacticalApiClient.createScriptSchedule(payload)
  if (!res.ok) {
    throw new Error(res.error || `Failed to create schedule (${res.status})`)
  }
  return res.data
}

async function updateScriptScheduleApi(params: {
  id: string
  payload: UpdateScriptSchedulePayload
}): Promise<ScriptScheduleDetail> {
  const res = await tacticalApiClient.updateScriptSchedule(params.id, params.payload)
  if (!res.ok) {
    throw new Error(res.error || `Failed to update schedule (${res.status})`)
  }
  return res.data
}

async function deleteScriptScheduleApi(id: string): Promise<void> {
  const res = await tacticalApiClient.deleteScriptSchedule(id)
  if (!res.ok) {
    throw new Error(res.error || `Failed to delete schedule (${res.status})`)
  }
}

async function replaceScheduleAgentsApi(params: {
  id: string
  agents: string[]
}): Promise<AgentsModifyResponse> {
  const res = await tacticalApiClient.replaceScriptScheduleAgents(params.id, params.agents)
  if (!res.ok) {
    throw new Error(res.error || `Failed to update agents (${res.status})`)
  }
  return res.data
}

async function addScheduleAgentsApi(params: {
  id: string
  agents: string[]
}): Promise<AgentsModifyResponse> {
  const res = await tacticalApiClient.addScriptScheduleAgents(params.id, params.agents)
  if (!res.ok) {
    throw new Error(res.error || `Failed to add agents (${res.status})`)
  }
  return res.data
}

async function removeScheduleAgentsApi(params: {
  id: string
  agents: string[]
}): Promise<AgentsModifyResponse> {
  const res = await tacticalApiClient.removeScriptScheduleAgents(params.id, params.agents)
  if (!res.ok) {
    throw new Error(res.error || `Failed to remove agents (${res.status})`)
  }
  return res.data
}

// ============ Hooks ============

export function useCreateScriptSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createScriptScheduleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.all })
    },
  })
}

export function useUpdateScriptSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateScriptScheduleApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.all })
    },
  })
}

export function useDeleteScriptSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteScriptScheduleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.all })
    },
  })
}

export function useReplaceScheduleAgents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: replaceScheduleAgentsApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.agents(variables.id) })
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.detail(variables.id) })
    },
  })
}

export function useAddScheduleAgents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addScheduleAgentsApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.agents(variables.id) })
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.detail(variables.id) })
    },
  })
}

export function useRemoveScheduleAgents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeScheduleAgentsApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.agents(variables.id) })
      queryClient.invalidateQueries({ queryKey: scriptScheduleQueryKeys.detail(variables.id) })
    },
  })
}
