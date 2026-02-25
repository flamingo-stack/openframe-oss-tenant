'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Monitor, Square } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface TestRunData {
  id: string;
  deviceName: string;
  agentToolId: string;
  startedAt: string;
  startTime: number;
  status: 'running' | 'completed' | 'error' | 'aborted';
  output: string[];
  elapsedSeconds: number;
}

interface TestRunCardProps {
  run: TestRunData;
  onStop: (runId: string) => void;
}

function formatDuration(totalSeconds: number): string {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getStatusLabel(status: TestRunData['status']): string {
  switch (status) {
    case 'running':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'aborted':
      return 'Aborted';
    case 'error':
      return 'Failed';
  }
}

function getStatusColor(status: TestRunData['status']): string {
  switch (status) {
    case 'running':
      return 'text-ods-accent';
    case 'completed':
      return 'text-[#5ea62e]';
    case 'aborted':
    case 'error':
      return 'text-error';
  }
}

export function TestRunCard({ run, onStop }: TestRunCardProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, []);

  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] overflow-clip">
      {/* Desktop: single row | Tablet: 2 rows | Mobile: 2 rows (different split) */}

      {/* Row 1: Mobile: Device + Started + Duration | Tablet: Device + Started | Desktop: all 4 cells */}
      <div className="flex gap-4 items-center px-4 py-3 border-b border-ods-border">
        {/* Device */}
        <div className="flex-1 flex flex-col justify-center h-[80px] overflow-hidden">
          <div className="flex gap-1 items-center">
            <Monitor className="h-6 w-6 text-ods-text-secondary flex-shrink-0" />
            <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
              {run.deviceName}
            </span>
          </div>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888] truncate">Device</span>
        </div>

        {/* Started */}
        <div className="flex-1 flex flex-col justify-center h-[80px] overflow-hidden">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {run.startedAt}
          </span>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888]">Started</span>
        </div>

        {/* Duration - mobile + desktop, hidden on tablet (moves to row 2) */}
        <div className="flex-1 flex flex-col justify-center h-[80px] overflow-hidden md:hidden lg:flex">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary tabular-nums">
            {formatDuration(run.elapsedSeconds)}
          </span>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888]">Duration</span>
        </div>

        {/* Status + Actions - desktop only in row 1 */}
        <div className="hidden lg:flex flex-1 items-center gap-2 h-[80px]">
          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            <span
              className={`font-['DM_Sans'] font-medium text-[18px] leading-[24px] ${getStatusColor(run.status)} truncate`}
            >
              {getStatusLabel(run.status)}
            </span>
            <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888]">Status</span>
          </div>

          {run.status === 'running' && (
            <Button
              variant="outline"
              onClick={() => onStop(run.id)}
              leftIcon={<Square className="h-6 w-6" />}
              className="flex-shrink-0 gap-2"
            >
              Stop Script
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Mobile: Status + Button | Tablet: Duration + Status + Button | Desktop: hidden */}
      <div className="flex lg:hidden gap-4 items-center px-4 py-3 border-b border-ods-border">
        {/* Duration - tablet only (on mobile it's in row 1) */}
        <div className="hidden md:flex flex-1 flex-col justify-center h-[80px] overflow-hidden">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary tabular-nums">
            {formatDuration(run.elapsedSeconds)}
          </span>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888]">Duration</span>
        </div>

        {/* Status + Actions */}
        <div className="flex-1 flex items-center gap-2 h-[80px]">
          <div className="flex-1 flex flex-col justify-center">
            <span className={`font-['DM_Sans'] font-medium text-[18px] leading-[24px] ${getStatusColor(run.status)}`}>
              {getStatusLabel(run.status)}
            </span>
            <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888]">Status</span>
          </div>

          {run.status === 'running' && (
            <div className="flex">
              <Button variant="outline" onClick={() => onStop(run.id)} leftIcon={<Square className="h-6 w-6" />}>
                Stop Script
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Log output */}
      <div ref={logRef} className="h-[400px] overflow-y-auto p-4 border-b border-ods-border items-end">
        <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888] whitespace-pre-wrap">
          {run.output.map((line, i) => {
            const isError = line.toLowerCase().startsWith('error');
            const isSuccess =
              line.toLowerCase().includes('success') ||
              line.toLowerCase().includes('passed') ||
              line.toLowerCase().includes('completed');
            return (
              <div key={i} className={isError ? 'text-error' : isSuccess ? 'text-[#5ea62e]' : ''}>
                {line}
              </div>
            );
          })}
          {run.status === 'running' && <div className="text-ods-accent animate-pulse">Waiting for response...</div>}
        </div>
      </div>
    </div>
  );
}
