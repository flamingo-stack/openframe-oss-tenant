'use client'

import { DashboardInfoCard, LogsList } from '@flamingo/ui-kit'
import type { LogEntry, LogSeverity, ToolType } from '@flamingo/ui-kit'
import { toUiKitToolType } from '@lib/tool-labels'
import { useLogsOverview } from '../hooks/use-dashboard-stats'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { useLogs } from '../../logs-page/hooks/use-logs'

export function LogsOverviewSection() {
  const logs = useLogsOverview()
  const router = useRouter()
  const {
    logs: rawLogs,
    isLoading,
    fetchLogs,
    error
  } = useLogs()

  useEffect(() => {
    fetchLogs('', {}, null, false)
  }, [])

  const recentLogs = useMemo(() => {
    if (!rawLogs || rawLogs.length === 0) return []

    return rawLogs.slice(0, 10).map((log): LogEntry => {
      return {
        id: log.toolEventId,
        severity: (log.severity || 'INFO') as LogSeverity,
        title: log.summary || log.eventType || 'Log Entry',
        timestamp: log.timestamp,
        toolType: toUiKitToolType(log.toolType || '') as ToolType,
        message: log.message,
        ingestDay: log.ingestDay,
        eventType: log.eventType
      }
    })
  }, [rawLogs])

  const handleLogClick = (log: LogEntry) => {
    router.push(`/log-details?id=${log.id}&ingestDay=${log.ingestDay}&toolType=${log.toolType?.toUpperCase()}&eventType=${log.eventType}&timestamp=${encodeURIComponent(log.timestamp.toString() || '')}`)
  }

  const handleInfoCardClick = () => {
    router.push(`/logs-page`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
          Logs Overview
        </h2>
        <p className="text-ods-text-secondary font-['DM_Sans'] font-medium text-[14px] mt-1">
          {logs.total.toLocaleString()} Logs in Total
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:grid-rows-[minmax(0,_1fr)] lg:overflow-hidden">
        {/* Left column - Info Cards */}
        <div className="flex flex-col gap-4">
          <DashboardInfoCard
            title="Info Logs"
            value={logs.info}
            percentage={logs.infoPercentage}
            showProgress
            progressColor="#5ea62e"
            onClick={handleInfoCardClick}
          />
          <DashboardInfoCard
            title="Warning Logs"
            value={logs.warning}
            percentage={logs.warningPercentage}
            showProgress
            progressColor="#d29b2e"
            onClick={handleInfoCardClick}
          />
          <DashboardInfoCard
            title="Critical Logs"
            value={logs.critical}
            percentage={logs.criticalPercentage}
            showProgress
            progressColor="#b43b3b"
            onClick={handleInfoCardClick}
          />
        </div>

        {/* Right column - Logs List */}
        <div className="lg:relative lg:min-h-0">
          <div className="lg:absolute lg:inset-0">
            <LogsList
              logs={recentLogs}
              maxHeight="100%"
              onLogClick={handleLogClick}
              className="h-full"
              loading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogsOverviewSection
