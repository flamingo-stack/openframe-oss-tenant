'use client'

import { DashboardInfoCard, LogsList } from '@flamingo-stack/openframe-frontend-core'
import type { LogEntry, LogSeverity } from '@flamingo-stack/openframe-frontend-core'
import { toUiKitToolType } from '@lib/tool-labels'
import { navigateToLogDetails } from '@lib/log-navigation'
import { useLogsOverview } from '../hooks/use-dashboard-stats'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { useLogs } from '../../logs-page/hooks/use-logs'

// Extend LogEntry to include originalLogEntry for navigation
type ExtendedLogEntry = LogEntry & { originalLogEntry?: any }

export function LogsOverviewSection() {
  const logs = useLogsOverview()
  const router = useRouter()
  const {
    logs: rawLogs,
    isLoading,
    fetchLogs
  } = useLogs()

  useEffect(() => {
    fetchLogs('', {}, null, false)
  }, [fetchLogs])

  const recentLogs = useMemo((): ExtendedLogEntry[] => {
    if (!rawLogs || rawLogs.length === 0) return []

    return rawLogs.slice(0, 10).map((log) => {
      return {
        id: log.toolEventId,
        severity: (log.severity || 'INFO') as LogSeverity,
        title: log.summary || log.eventType || 'Log Entry',
        timestamp: log.timestamp,
        toolType: toUiKitToolType(log.toolType || ''),
        message: log.message,
        ingestDay: log.ingestDay,
        eventType: log.eventType,
        originalLogEntry: log  // Store original log for navigation
      }
    })
  }, [rawLogs])

  const handleLogClick = (log: LogEntry) => {
    navigateToLogDetails(router, log)
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
            href="/logs-page"
          />
          <DashboardInfoCard
            title="Warning Logs"
            value={logs.warning}
            percentage={logs.warningPercentage}
            showProgress
            progressColor="#d29b2e"
            href="/logs-page"
          />
          <DashboardInfoCard
            title="Critical Logs"
            value={logs.critical}
            percentage={logs.criticalPercentage}
            showProgress
            progressColor="#b43b3b"
            href="/logs-page"
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
