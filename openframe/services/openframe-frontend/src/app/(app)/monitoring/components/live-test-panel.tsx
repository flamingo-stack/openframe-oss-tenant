'use client';

import type { QueryResultRow } from '@flamingo-stack/openframe-frontend-core';
import { Button, QueryReportTable } from '@flamingo-stack/openframe-frontend-core';
import { ChevronDown, ChevronRight, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CampaignEmptyResult, CampaignError, CampaignTotals } from '../hooks/use-live-campaign';

export interface LiveTestPanelProps {
  mode: 'query' | 'policy';
  isRunning: boolean;
  startedAt: Date | null;
  results: QueryResultRow[];
  errors: CampaignError[];
  emptyResults: CampaignEmptyResult[];
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

function CollapsibleSection({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = isOpen ? ChevronDown : ChevronRight;

  return (
    <div className="border-b border-ods-border shrink-0">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-4 py-3 text-left"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <Icon size={14} style={{ color }} />
        <span className="text-sm font-medium" style={{ color }}>
          {title}
        </span>
      </button>
      {isOpen && <div className="px-4 pb-3 space-y-0.5 max-h-24 overflow-y-auto">{children}</div>}
    </div>
  );
}

export function LiveTestPanel({
  mode,
  isRunning,
  startedAt,
  results,
  errors,
  emptyResults,
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

  const [durationMs, setDurationMs] = useState(0);
  useEffect(() => {
    if (!startedAt || !isRunning) {
      if (startedAt && !isRunning) {
        setDurationMs(Date.now() - startedAt.getTime());
      }
      return;
    }
    setDurationMs(Date.now() - startedAt.getTime());
    const interval = setInterval(() => {
      setDurationMs(Date.now() - startedAt.getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isRunning]);

  return (
    <div className="flex flex-col gap-1">
      {/* Section title */}
      <h3 className="text-h5 uppercase tracking-[-0.28px] text-ods-text-secondary">{label} TESTING</h3>

      {/* Card container */}
      <div className="bg-ods-card border border-ods-border rounded-[6px] max-h-[600px] overflow-clip flex flex-col">
        {/* Header row */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-ods-border shrink-0">
          {/* Started */}
          <div className="flex flex-[1_0_0] flex-col">
            <span className="text-h4 text-ods-text-primary">{startedAt ? formatTime(startedAt) : '--:--:--'}</span>
            <span className="text-h6 text-ods-text-secondary">Started</span>
          </div>

          {/* Duration */}
          <div className="flex flex-[1_0_0] flex-col">
            <span className="text-h4 text-ods-text-primary">{formatDuration(durationMs)}</span>
            <span className="text-h6 text-ods-text-secondary">Duration</span>
          </div>

          {/* Hosts */}
          {totalOnlineHosts > 0 && (
            <div className="flex flex-[1_0_0] flex-col">
              <span className="text-h4 text-ods-text-primary">
                {totalResponded}/{totalOnlineHosts}
                {hostsFailed > 0 && (
                  <span className="text-[var(--ods-attention-red-error)] ml-1">({hostsFailed} failed)</span>
                )}
              </span>
              <span className="text-h6 text-ods-text-secondary">Devices Online</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-[1_0_0] items-center gap-4 justify-end">
            {!isRunning && (
              <Button variant="outline" size="sm" className="h-11 md:h-12" onClick={onTestAgain}>
                Test Again
              </Button>
            )}
            {isRunning && (
              <Button
                variant="outline"
                size="sm"
                className="h-11 md:h-12"
                leftIcon={<Square size={14} />}
                onClick={onStop}
              >
                Stop
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              centerIcon={<X size={24} />}
              aria-label="Close test panel"
            />
          </div>
        </div>

        {/* Error summary */}
        {isFinished && errors.length > 0 && (
          <CollapsibleSection
            color="var(--ods-attention-red-error)"
            title={`${errors.length} host${errors.length !== 1 ? 's' : ''} returned errors`}
          >
            {errors.slice(0, 10).map((err, i) => (
              <p key={i} className="text-xs text-ods-text-secondary">
                {err.host_display_name}: {err.error}
              </p>
            ))}
            {errors.length > 10 && <p className="text-xs text-ods-text-secondary">...and {errors.length - 10} more</p>}
          </CollapsibleSection>
        )}

        {/* Empty results warning */}
        {isFinished && emptyResults.length > 0 && (
          <CollapsibleSection
            color="var(--color-warning)"
            title={`${emptyResults.length} host${emptyResults.length !== 1 ? 's' : ''} returned no data`}
          >
            {emptyResults.slice(0, 10).map((item, i) => (
              <p key={i} className="text-xs text-ods-text-secondary">
                {item.host_display_name}
              </p>
            ))}
            {emptyResults.length > 10 && (
              <p className="text-xs text-ods-text-secondary">...and {emptyResults.length - 10} more</p>
            )}
          </CollapsibleSection>
        )}

        {/* Results table */}
        <div className="flex-1 overflow-auto">
          <QueryReportTable
            title=""
            data={results}
            loading={isRunning && results.length === 0}
            skeletonRows={4}
            emptyMessage={isRunning ? 'Waiting for results...' : 'No results returned'}
            columnOrder={['host_display_name']}
            exportFilename={`test-${mode}-results`}
            showExport={false}
            variant="default"
          />
        </div>
      </div>
    </div>
  );
}
