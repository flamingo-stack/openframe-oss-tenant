'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@lib/api-client'
import { GET_DEVICE_FILTERS_QUERY } from '../../devices/queries/devices-queries'
import type { GraphQLResponse } from '../../devices/types/device.types'
import { GET_LOGS_QUERY } from '../../logs-page/queries/logs-queries'

export function useDevicesOverview() {
  const [stats, setStats] = useState(() => ({
    total: 0,
    active: 0,
    inactive: 0,
    activePercentage: 0,
    inactivePercentage: 0
  }))

  useEffect(() => {
    let isMounted = true

    const fetchStatusCounts = async () => {
      try {
        type DeviceFiltersResponse = { deviceFilters: { filteredCount: number, statuses?: Array<{ value: string, count: number }> } }

        const devRes: { ok: boolean, status: number, error?: string, data?: GraphQLResponse<DeviceFiltersResponse> } = await apiClient.post<GraphQLResponse<DeviceFiltersResponse>>('/api/graphql', {
          query: GET_DEVICE_FILTERS_QUERY,
          variables: { filter: {} }
        })

        if (!devRes.ok) {
          throw new Error(devRes.error || `Request failed with status ${devRes.status}`)
        }

        const total = devRes.data?.data?.deviceFilters?.filteredCount || 0
        const statuses = devRes.data?.data?.deviceFilters?.statuses || []
        const active = statuses
          .filter(s => ['ACTIVE', 'ONLINE'].includes((s.value || '').toUpperCase()))
          .reduce((sum, s) => sum + (s.count || 0), 0)
        const inactive = Math.max(0, total - active)

        if (!isMounted) return

        setStats({
          total,
          active,
          inactive,
          activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
          inactivePercentage: total > 0 ? Math.round((inactive / total) * 100) : 0
        })
      } catch (err) {
        // Swallow errors for now; keep zeros. Dashboard can still render.
      }
    }

    fetchStatusCounts()
    return () => { isMounted = false }
  }, [])

  return stats
}

export function useChatsOverview() {
  return useMemo(() => {
    // Mock data for saas-tenant mode until
    const total = 1250
    const active = 136
    const resolved = 825
    const avgResolveTime = '00:38:00'
    const avgFaeRate = 3.6

    const activePercentage = Math.round((active / total) * 100)
    const resolvedPercentage = Math.round((resolved / total) * 100)

    return {
      total,
      active,
      resolved,
      avgResolveTime,
      avgFaeRate,
      activePercentage,
      resolvedPercentage
    }
  }, [])
}

export function useLogsOverview() {
  const [stats, setStats] = useState(() => ({
    total: 0,
    info: 0,
    warning: 0,
    critical: 0,
    infoPercentage: 0,
    warningPercentage: 0,
    criticalPercentage: 0
  }))

  useEffect(() => {
    let isMounted = true

    const fetchSeverityCounts = async () => {
      try {
        const normalize = (v: string) => v?.toUpperCase?.() || v

        type LogEdge = { node: { severity?: string } }
        type PageInfo = { hasNextPage: boolean, endCursor?: string | null }
        type LogsResponse = { logs: { edges: LogEdge[], pageInfo: PageInfo } }

        const pageLimit = 50
        let cursor: string | null | undefined = null
        let hasNext = true
        let total = 0
        let info = 0
        let warning = 0
        let critical = 0
        let safetyPages = 50

        while (hasNext && safetyPages > 0) {
          const logsRes: { ok: boolean, status: number, error?: string, data?: GraphQLResponse<LogsResponse> } = await apiClient.post<GraphQLResponse<LogsResponse>>('/api/graphql', {
            query: GET_LOGS_QUERY,
            variables: {
              filter: {},
              pagination: { limit: pageLimit, cursor },
              search: ''
            }
          })

          if (!logsRes.ok) {
            throw new Error(logsRes.error || `Request failed with status ${logsRes.status}`)
          }

          const data: LogsResponse | undefined = logsRes.data?.data
          if (!data) break

          const edges: LogEdge[] = data.logs.edges || []
          total += edges.length

          for (const e of edges) {
            const sev = normalize(e?.node?.severity || '')
            if (sev === 'INFO') info += 1
            else if (sev === 'WARNING') warning += 1
            else if (sev === 'CRITICAL') critical += 1
          }

          hasNext = !!data.logs.pageInfo?.hasNextPage
          cursor = data.logs.pageInfo?.endCursor || null
          safetyPages -= 1
        }

        if (!isMounted) return

        setStats({
          total,
          info,
          warning,
          critical,
          infoPercentage: total > 0 ? Math.round((info / total) * 100) : 0,
          warningPercentage: total > 0 ? Math.round((warning / total) * 100) : 0,
          criticalPercentage: total > 0 ? Math.round((critical / total) * 100) : 0
        })
      } catch (err) {
        // keep zeros if request fails
      }
    }

    fetchSeverityCounts()
    return () => { isMounted = false }
  }, [])

  return stats
}


