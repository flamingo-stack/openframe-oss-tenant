'use client'

import { Button, QueryReportTable } from '@flamingo-stack/openframe-frontend-core'
import { Play, Square, RotateCcw } from 'lucide-react'
import { useLiveCampaign } from '../hooks/use-live-campaign'

interface LiveTestPanelProps {
  sql: string
  mode: 'query' | 'policy'
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function LiveTestPanel({ sql, mode }: LiveTestPanelProps) {
  const {
    startCampaign,
    stopCampaign,
    isRunning,
    startedAt,
    durationMs,
    results,
    errors,
    totals,
    hostsResponded,
    hostsFailed,
    campaignStatus,
  } = useLiveCampaign()

  const label = mode === 'query' ? 'Query' : 'Policy'
  const hasRun = startedAt !== null
  const isFinished = campaignStatus === 'finished'

  const handleStart = () => {
    startCampaign(sql)
  }

  const handleStop = () => {
    stopCampaign()
  }

  const totalOnlineHosts = totals?.online ?? 0
  const totalResponded = hostsResponded + hostsFailed

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">
            Test {label}
          </h3>

          {hasRun && (
            <div className="flex items-center gap-3 text-sm text-ods-text-secondary">
              <span>Started: {formatTime(startedAt!)}</span>
              <span className="text-ods-border">•</span>
              <span>Duration: {formatDuration(durationMs)}</span>
              {totalOnlineHosts > 0 && (
                <>
                  <span className="text-ods-border">•</span>
                  <span>
                    {totalResponded}/{totalOnlineHosts} hosts
                  </span>
                </>
              )}
              {hostsFailed > 0 && (
                <>
                  <span className="text-ods-border">•</span>
                  <span className="text-[var(--ods-attention-red-error)]">
                    {hostsFailed} failed
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isRunning && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={hasRun ? <RotateCcw size={16} /> : <Play size={16} />}
              onClick={handleStart}
              disabled={!sql.trim()}
            >
              {hasRun ? 'Test Again' : `Test ${label}`}
            </Button>
          )}
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Square size={16} />}
              onClick={handleStop}
            >
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Error summary */}
      {isFinished && errors.length > 0 && (
        <div className="bg-ods-card border border-ods-border rounded-lg p-4">
          <p className="text-sm font-medium text-[var(--ods-attention-red-error)]">
            {errors.length} host{errors.length !== 1 ? 's' : ''} returned errors
          </p>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {errors.slice(0, 10).map((err, i) => (
              <p key={i} className="text-xs text-ods-text-secondary">
                {err.host_display_name}: {err.error}
              </p>
            ))}
            {errors.length > 10 && (
              <p className="text-xs text-ods-text-secondary">...and {errors.length - 10} more</p>
            )}
          </div>
        </div>
      )}

      {/* Results table */}
      {hasRun && (
        <QueryReportTable
          title={`${label} Results`}
          data={results}
          loading={isRunning && results.length === 0}
          emptyMessage={isRunning ? 'Waiting for results...' : 'No results returned'}
          columnOrder={['host_display_name']}
          exportFilename={`test-${mode}-results`}
          showExport={isFinished && results.length > 0}
        />
      )}
    </div>
  )
}
