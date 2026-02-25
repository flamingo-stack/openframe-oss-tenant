'use client';

import type { QueryResultRow } from '@flamingo-stack/openframe-frontend-core';
import { Button, QueryReportTable } from '@flamingo-stack/openframe-frontend-core';
import { RotateCcw, Square, X } from 'lucide-react';
import type { CampaignError, CampaignTotals } from '../hooks/use-live-campaign';

export interface LiveTestPanelProps {
  mode: 'query' | 'policy';
  isRunning: boolean;
  startedAt: Date | null;
  durationMs: number;
  results: QueryResultRow[];
  errors: CampaignError[];
  totals: CampaignTotals | null;
  hostsResponded: number;
  hostsFailed: number;
  campaignStatus: '' | 'pending' | 'finished';
  onTestAgain: () => void;
  onStop: () => void;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function LiveTestPanel({
  mode,
  isRunning,
  startedAt,
  durationMs,
  results,
  errors,
  totals,
  hostsResponded,
  hostsFailed,
  campaignStatus,
  onTestAgain,
  onStop,
  onClose,
}: LiveTestPanelProps) {
  const label = mode === 'query' ? 'QUERY' : 'POLICY';
  const isFinished = campaignStatus === 'finished';
  const totalOnlineHosts = totals?.online ?? 0;
  const totalResponded = hostsResponded + hostsFailed;

  return (
    <div className="space-y-3">
      {/* Section title */}
      <h3 className="font-mono text-xs font-medium uppercase tracking-widest text-ods-text-secondary">
        {label} TESTING
      </h3>

      {/* Card container */}
      <div className="bg-ods-card border border-ods-border rounded-[6px] h-[600px] overflow-clip flex flex-col">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 h-[56px] border-b border-ods-border shrink-0">
          <div className="flex items-center gap-6">
            {/* Started */}
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ods-text-secondary">Started</span>
              <span className="font-mono text-sm text-ods-text-primary">
                {startedAt ? formatTime(startedAt) : '--:--:--'}
              </span>
            </div>

            {/* Duration */}
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ods-text-secondary">Duration</span>
              <span className="font-mono text-sm text-ods-text-primary">{formatDuration(durationMs)}</span>
            </div>

            {/* Hosts */}
            {totalOnlineHosts > 0 && (
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ods-text-secondary">Hosts</span>
                <span className="font-mono text-sm text-ods-text-primary">
                  {totalResponded}/{totalOnlineHosts}
                  {hostsFailed > 0 && (
                    <span className="text-[var(--ods-attention-red-error)] ml-1">({hostsFailed} failed)</span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isRunning && (
              <Button variant="outline" size="sm" leftIcon={<RotateCcw size={14} />} onClick={onTestAgain}>
                Test Again
              </Button>
            )}
            {isRunning && (
              <Button variant="outline" size="sm" leftIcon={<Square size={14} />} onClick={onStop}>
                Stop
              </Button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-md text-ods-text-secondary hover:text-ods-text-primary hover:bg-ods-bg-hover transition-colors"
              aria-label="Close test panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Error summary */}
        {isFinished && errors.length > 0 && (
          <div className="px-4 py-3 border-b border-ods-border shrink-0">
            <p className="text-sm font-medium text-[var(--ods-attention-red-error)]">
              {errors.length} host{errors.length !== 1 ? 's' : ''} returned errors
            </p>
            <div className="mt-1 space-y-0.5 max-h-24 overflow-y-auto">
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
        <div className="flex-1 overflow-auto">
          <QueryReportTable
            title=""
            data={results}
            loading={isRunning && results.length === 0}
            skeletonRows={5}
            emptyMessage={isRunning ? 'Waiting for results...' : 'No results returned'}
            columnOrder={['host_display_name']}
            exportFilename={`test-${mode}-results`}
            showExport={false}
            variant="compact"
          />
        </div>
      </div>
    </div>
  );
}
